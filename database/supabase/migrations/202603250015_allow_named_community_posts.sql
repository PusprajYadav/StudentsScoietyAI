-- Student Society: allow community posts to keep identity unless the user chooses anonymous mode

CREATE OR REPLACE FUNCTION public.enforce_post_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  settings_row public.platform_settings%ROWTYPE;
  image_count INTEGER;
  max_images INTEGER := 5;
  max_pdf_size_mb INTEGER := 10;
BEGIN
  SELECT *
  INTO settings_row
  FROM public.platform_settings
  WHERE id = 1;

  IF FOUND THEN
    max_images := settings_row.max_images_per_post;
    max_pdf_size_mb := settings_row.max_pdf_size_mb;
  END IF;

  NEW.tags := coalesce(NEW.tags, ARRAY[]::TEXT[]);
  NEW.image_urls := coalesce(NEW.image_urls, ARRAY[]::TEXT[]);
  NEW.poll_options := coalesce(NEW.poll_options, ARRAY[]::TEXT[]);

  IF NEW.image_url IS NOT NULL AND coalesce(array_length(NEW.image_urls, 1), 0) = 0 THEN
    NEW.image_urls := ARRAY[NEW.image_url];
  END IF;

  image_count := coalesce(array_length(NEW.image_urls, 1), 0);

  IF image_count > max_images THEN
    RAISE EXCEPTION 'A post can include at most % images.', max_images;
  END IF;

  IF NEW.pdf_size_bytes IS NOT NULL AND NEW.pdf_size_bytes > (max_pdf_size_mb::BIGINT * 1024 * 1024) THEN
    RAISE EXCEPTION 'PDF uploads must stay within % MB.', max_pdf_size_mb;
  END IF;

  IF NEW.pdf_page_count IS NOT NULL AND NEW.pdf_page_count < 1 THEN
    RAISE EXCEPTION 'PDF page count must be at least 1.';
  END IF;

  -- Only force anonymity for the actual anonymous discussion mode.
  -- Community posts may now keep identity unless the client explicitly sets is_anonymous = true.
  IF NEW.discussion_kind = 'anonymous' THEN
    NEW.is_anonymous := TRUE;
  END IF;

  IF NEW.post_type = 'poll' THEN
    IF nullif(btrim(coalesce(NEW.poll_question, '')), '') IS NULL THEN
      NEW.poll_question := NEW.title;
    ELSE
      NEW.poll_question := btrim(NEW.poll_question);
    END IF;

    IF coalesce(array_length(NEW.poll_options, 1), 0) < 2 THEN
      RAISE EXCEPTION 'Poll posts must have at least two options.';
    END IF;
  ELSE
    NEW.poll_question := NULL;
    NEW.poll_options := ARRAY[]::TEXT[];
  END IF;

  IF NEW.link_url IS NOT NULL AND nullif(btrim(NEW.link_url), '') IS NULL THEN
    NEW.link_url := NULL;
  END IF;

  RETURN NEW;
END;
$$;
