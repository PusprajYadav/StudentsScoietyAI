-- Student Society: stronger backend guardrails for rich posts and faster search

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
ON public.profiles
USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
ON public.profiles
USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_title_trgm
ON public.posts
USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
ON public.posts
USING gin (content gin_trgm_ops);

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

  IF NEW.visibility_scope = 'community' OR NEW.discussion_kind = 'anonymous' THEN
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

DROP TRIGGER IF EXISTS posts_enforce_guardrails ON public.posts;
CREATE TRIGGER posts_enforce_guardrails
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_post_guardrails();

CREATE OR REPLACE FUNCTION public.enforce_comment_reply_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_post_id UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT post_id
  INTO parent_post_id
  FROM public.comments
  WHERE id = NEW.parent_comment_id;

  IF parent_post_id IS NULL THEN
    RAISE EXCEPTION 'Parent comment does not exist.';
  END IF;

  IF parent_post_id <> NEW.post_id THEN
    RAISE EXCEPTION 'Reply comments must belong to the same post.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_enforce_reply_integrity ON public.comments;
CREATE TRIGGER comments_enforce_reply_integrity
BEFORE INSERT OR UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_comment_reply_integrity();

CREATE OR REPLACE FUNCTION public.enforce_poll_vote_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_post_type public.post_type;
  option_count INTEGER;
BEGIN
  SELECT post_type, coalesce(array_length(poll_options, 1), 0)
  INTO target_post_type, option_count
  FROM public.posts
  WHERE id = NEW.post_id;

  IF target_post_type IS NULL THEN
    RAISE EXCEPTION 'Poll post not found.';
  END IF;

  IF target_post_type <> 'poll' THEN
    RAISE EXCEPTION 'Votes can only be recorded for poll posts.';
  END IF;

  IF NEW.option_index < 0 OR NEW.option_index >= option_count THEN
    RAISE EXCEPTION 'Selected poll option is out of range.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS poll_votes_enforce_integrity ON public.poll_votes;
CREATE TRIGGER poll_votes_enforce_integrity
BEFORE INSERT OR UPDATE ON public.poll_votes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_poll_vote_integrity();

DROP POLICY IF EXISTS "likes_read_all" ON public.likes;
CREATE POLICY "likes_read_visible_posts"
ON public.likes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = likes.post_id
      AND (
        (p.moderation_state = 'published' AND (p.visibility_scope = 'discussion' OR public.can_view_community(p.community_id)))
        OR p.author_id = auth.uid()
      )
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "likes_insert_self" ON public.likes;
CREATE POLICY "likes_insert_self"
ON public.likes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = likes.post_id
      AND p.moderation_state = 'published'
      AND (
        p.visibility_scope = 'discussion'
        OR public.can_view_community(p.community_id)
      )
  )
);

DROP POLICY IF EXISTS "shares_read_all" ON public.shares;
CREATE POLICY "shares_read_visible_posts"
ON public.shares FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = shares.post_id
      AND (
        (p.moderation_state = 'published' AND (p.visibility_scope = 'discussion' OR public.can_view_community(p.community_id)))
        OR p.author_id = auth.uid()
      )
  )
  OR public.is_admin()
);
