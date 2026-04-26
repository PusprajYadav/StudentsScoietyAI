-- Student Society: social/contact links on profile

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::JSONB;

UPDATE public.profiles
SET social_links = '{}'::JSONB
WHERE social_links IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_social_links_is_object'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_social_links_is_object
      CHECK (jsonb_typeof(social_links) = 'object');
  END IF;
END $$;
