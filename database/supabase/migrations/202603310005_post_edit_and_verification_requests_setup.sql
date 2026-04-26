-- Student Society: post edit pricing and verified badge request workflow

DO $$
DECLARE
  attachment_constraint TEXT;
  file_kind_constraint TEXT;
BEGIN
  SELECT conname
  INTO attachment_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.media_assets'::regclass
    AND pg_get_constraintdef(oid) ILIKE '%usage IN (''avatar'', ''banner'')%'
  LIMIT 1;

  IF attachment_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.media_assets DROP CONSTRAINT %I', attachment_constraint);
  END IF;

  SELECT conname
  INTO file_kind_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.media_assets'::regclass
    AND pg_get_constraintdef(oid) ILIKE '%file_kind = ''image''%'
    AND pg_get_constraintdef(oid) ILIKE '%usage IN (''avatar'', ''banner'', ''post_image'')%'
  LIMIT 1;

  IF file_kind_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.media_assets DROP CONSTRAINT %I', file_kind_constraint);
  END IF;
END $$;

ALTER TABLE public.media_assets
ADD CONSTRAINT media_assets_usage_attachment_check_v2
CHECK (
  (usage IN ('avatar', 'banner', 'verification_proof') AND attached_post_id IS NULL)
  OR
  (usage IN ('post_image', 'post_pdf') AND attached_profile_id IS NULL)
);

ALTER TABLE public.media_assets
ADD CONSTRAINT media_assets_file_kind_usage_check_v2
CHECK (
  (file_kind = 'image' AND usage IN ('avatar', 'banner', 'post_image', 'verification_proof'))
  OR
  (file_kind = 'pdf' AND usage IN ('post_pdf', 'verification_proof'))
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_request_status') THEN
    CREATE TYPE public.verification_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.verification_request_status NOT NULL DEFAULT 'pending',
  proof_media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  proof_public_url TEXT NOT NULL,
  proof_file_kind TEXT NOT NULL CHECK (proof_file_kind IN ('image', 'pdf')),
  request_note TEXT,
  submitted_coin_transaction_id UUID REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id_created_at
  ON public.verification_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_created_at
  ON public.verification_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_one_pending_per_user
  ON public.verification_requests(user_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS verification_requests_set_updated_at ON public.verification_requests;
CREATE TRIGGER verification_requests_set_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.coin_feature_settings (
  feature_key,
  feature_name,
  description,
  category,
  billing_model,
  coins_required,
  access_key,
  duration_days,
  is_enabled,
  sort_order
)
VALUES
  (
    'post_edit',
    'Edit post',
    'Charge coins whenever a user edits an existing post.',
    'community',
    'per_use',
    0,
    NULL,
    NULL,
    TRUE,
    18
  ),
  (
    'verification_request_submit',
    'Verified badge request',
    'Charge coins when a user submits identity proof for verified badge review.',
    'identity',
    'per_use',
    0,
    NULL,
    NULL,
    TRUE,
    62
  )
ON CONFLICT (feature_key) DO UPDATE
SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  billing_model = EXCLUDED.billing_model,
  sort_order = EXCLUDED.sort_order,
  updated_at = timezone('utc', now());

CREATE OR REPLACE FUNCTION private.charge_post_edit_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  feature_row public.coin_feature_settings;
  role_name TEXT := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF NEW.id IS NULL OR NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF role_name = 'service_role' OR auth.uid() IS DISTINCT FROM OLD.author_id THEN
    RETURN NEW;
  END IF;

  IF NEW.visibility_scope IS NOT DISTINCT FROM OLD.visibility_scope
    AND NEW.community_id IS NOT DISTINCT FROM OLD.community_id
    AND NEW.discussion_kind IS NOT DISTINCT FROM OLD.discussion_kind
    AND NEW.post_type IS NOT DISTINCT FROM OLD.post_type
    AND NEW.title IS NOT DISTINCT FROM OLD.title
    AND NEW.content IS NOT DISTINCT FROM OLD.content
    AND NEW.tags IS NOT DISTINCT FROM OLD.tags
    AND NEW.image_urls IS NOT DISTINCT FROM OLD.image_urls
    AND NEW.pdf_url IS NOT DISTINCT FROM OLD.pdf_url
    AND NEW.pdf_name IS NOT DISTINCT FROM OLD.pdf_name
    AND NEW.pdf_size_bytes IS NOT DISTINCT FROM OLD.pdf_size_bytes
    AND NEW.pdf_page_count IS NOT DISTINCT FROM OLD.pdf_page_count
    AND NEW.link_url IS NOT DISTINCT FROM OLD.link_url
    AND NEW.poll_question IS NOT DISTINCT FROM OLD.poll_question
    AND NEW.poll_options IS NOT DISTINCT FROM OLD.poll_options
    AND NEW.is_anonymous IS NOT DISTINCT FROM OLD.is_anonymous THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO feature_row
  FROM public.coin_feature_settings
  WHERE feature_key = 'post_edit'
    AND is_enabled = TRUE
  LIMIT 1;

  IF NOT FOUND OR feature_row.coins_required <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM private.apply_coin_transaction(
    NEW.author_id,
    feature_row.coins_required * -1,
    'feature_charge',
    feature_row.feature_key,
    'post_edit',
    format('%s:%s', NEW.id, coalesce(NEW.edited_at::text, timezone('utc', now())::text)),
    'Post edited',
    jsonb_build_object(
      'post_id', NEW.id,
      'visibility_scope', NEW.visibility_scope,
      'discussion_kind', NEW.discussion_kind
    ),
    auth.uid(),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_charge_coins_before_update ON public.posts;
CREATE TRIGGER posts_charge_coins_before_update
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION private.charge_post_edit_coins();

CREATE OR REPLACE FUNCTION private.charge_verification_request_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  PERFORM private.charge_feature_on_insert(
    NEW.user_id,
    'verification_request_submit',
    'verification_request',
    NEW.id::text,
    'Verified badge request submitted',
    jsonb_build_object('proof_file_kind', NEW.proof_file_kind)
  );

  SELECT id
  INTO NEW.submitted_coin_transaction_id
  FROM public.coin_transactions
  WHERE reference_type = 'verification_request'
    AND reference_id = NEW.id::text
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verification_requests_charge_coins_before_insert ON public.verification_requests;
CREATE TRIGGER verification_requests_charge_coins_before_insert
BEFORE INSERT ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION private.charge_verification_request_coins();

CREATE OR REPLACE FUNCTION public.review_verification_request(
  target_request_id UUID,
  next_status public.verification_request_status,
  admin_review_note TEXT DEFAULT NULL
)
RETURNS public.verification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  request_row public.verification_requests;
BEGIN
  IF actor_id IS NULL OR NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'Only admins can review verification requests.'
      USING ERRCODE = 'P0001';
  END IF;

  IF next_status NOT IN ('approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Review status must be approved, rejected, or cancelled.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.verification_requests
  SET
    status = next_status,
    review_note = nullif(trim(coalesce(admin_review_note, '')), ''),
    reviewed_by_user_id = actor_id,
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = target_request_id
    AND status = 'pending'
  RETURNING *
  INTO request_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This verification request is no longer pending.'
      USING ERRCODE = 'P0001';
  END IF;

  IF next_status = 'approved' THEN
    UPDATE public.profiles
    SET
      is_verified = TRUE,
      updated_at = timezone('utc', now())
    WHERE id = request_row.user_id;
  END IF;

  RETURN request_row;
END;
$$;

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_requests_read_self_or_admin" ON public.verification_requests;
CREATE POLICY "verification_requests_read_self_or_admin"
ON public.verification_requests FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "verification_requests_insert_self_or_admin" ON public.verification_requests;
CREATE POLICY "verification_requests_insert_self_or_admin"
ON public.verification_requests FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "verification_requests_update_admin" ON public.verification_requests;
CREATE POLICY "verification_requests_update_admin"
ON public.verification_requests FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());
