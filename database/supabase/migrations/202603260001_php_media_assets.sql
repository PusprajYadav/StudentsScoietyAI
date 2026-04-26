-- Student Society: PHP-hosted media registry for posts, avatars, and banners

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'media_usage'
  ) THEN
    CREATE TYPE public.media_usage AS ENUM ('avatar', 'banner', 'post_image', 'post_pdf');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage public.media_usage NOT NULL,
  file_kind TEXT NOT NULL CHECK (file_kind IN ('image', 'pdf')),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  original_size_bytes BIGINT NOT NULL CHECK (original_size_bytes > 0),
  stored_size_bytes BIGINT NOT NULL CHECK (stored_size_bytes > 0),
  compression_quality INTEGER NOT NULL DEFAULT 20 CHECK (compression_quality BETWEEN 1 AND 100),
  compression_ratio NUMERIC(8, 5) NOT NULL DEFAULT 1 CHECK (compression_ratio > 0),
  width INTEGER,
  height INTEGER,
  pdf_page_count INTEGER,
  attached_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  attached_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (
    (usage IN ('avatar', 'banner') AND attached_post_id IS NULL)
    OR
    (usage IN ('post_image', 'post_pdf') AND attached_profile_id IS NULL)
  ),
  CHECK (
    (file_kind = 'image' AND usage IN ('avatar', 'banner', 'post_image'))
    OR
    (file_kind = 'pdf' AND usage = 'post_pdf')
  ),
  CHECK (width IS NULL OR width > 0),
  CHECK (height IS NULL OR height > 0),
  CHECK (pdf_page_count IS NULL OR pdf_page_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_id ON public.media_assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_usage ON public.media_assets(usage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_attached_post_id ON public.media_assets(attached_post_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_attached_profile_id ON public.media_assets(attached_profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_single_profile_usage
ON public.media_assets(attached_profile_id, usage)
WHERE attached_profile_id IS NOT NULL
  AND usage IN ('avatar', 'banner');

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_single_post_pdf
ON public.media_assets(attached_post_id)
WHERE attached_post_id IS NOT NULL
  AND usage = 'post_pdf';

DROP TRIGGER IF EXISTS media_assets_set_updated_at ON public.media_assets;
CREATE TRIGGER media_assets_set_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_post_media_assets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_image_urls TEXT[] := coalesce(NEW.image_urls, '{}'::TEXT[]);
BEGIN
  UPDATE public.media_assets
  SET attached_post_id = NULL,
      updated_at = timezone('utc', now())
  WHERE attached_post_id = NEW.id
    AND (
      (usage = 'post_image' AND NOT (public_url = ANY(next_image_urls)))
      OR
      (usage = 'post_pdf' AND coalesce(NEW.pdf_url, '') <> public_url)
    );

  IF coalesce(array_length(next_image_urls, 1), 0) > 0 THEN
    UPDATE public.media_assets
    SET attached_post_id = NEW.id,
        updated_at = timezone('utc', now())
    WHERE owner_id = NEW.author_id
      AND usage = 'post_image'
      AND public_url = ANY(next_image_urls);
  END IF;

  IF NEW.pdf_url IS NOT NULL THEN
    UPDATE public.media_assets
    SET attached_post_id = NEW.id,
        updated_at = timezone('utc', now())
    WHERE owner_id = NEW.author_id
      AND usage = 'post_pdf'
      AND public_url = NEW.pdf_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_sync_media_assets ON public.posts;
CREATE TRIGGER posts_sync_media_assets
AFTER INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_media_assets();

CREATE OR REPLACE FUNCTION public.sync_profile_media_assets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.media_assets
  SET attached_profile_id = NULL,
      updated_at = timezone('utc', now())
  WHERE attached_profile_id = NEW.id
    AND (
      (usage = 'avatar' AND coalesce(NEW.avatar_url, '') <> public_url)
      OR
      (usage = 'banner' AND coalesce(NEW.banner_url, '') <> public_url)
    );

  IF NEW.avatar_url IS NOT NULL THEN
    UPDATE public.media_assets
    SET attached_profile_id = NEW.id,
        updated_at = timezone('utc', now())
    WHERE owner_id = NEW.id
      AND usage = 'avatar'
      AND public_url = NEW.avatar_url;
  END IF;

  IF NEW.banner_url IS NOT NULL THEN
    UPDATE public.media_assets
    SET attached_profile_id = NEW.id,
        updated_at = timezone('utc', now())
    WHERE owner_id = NEW.id
      AND usage = 'banner'
      AND public_url = NEW.banner_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_media_assets ON public.profiles;
CREATE TRIGGER profiles_sync_media_assets
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_media_assets();

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_assets_read_owner_or_admin" ON public.media_assets;
CREATE POLICY "media_assets_read_owner_or_admin"
ON public.media_assets FOR SELECT
USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "media_assets_insert_owner_or_admin" ON public.media_assets;
CREATE POLICY "media_assets_insert_owner_or_admin"
ON public.media_assets FOR INSERT
WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "media_assets_update_owner_or_admin" ON public.media_assets;
CREATE POLICY "media_assets_update_owner_or_admin"
ON public.media_assets FOR UPDATE
USING (auth.uid() = owner_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "media_assets_delete_owner_or_admin" ON public.media_assets;
CREATE POLICY "media_assets_delete_owner_or_admin"
ON public.media_assets FOR DELETE
USING (auth.uid() = owner_id OR public.is_admin());
