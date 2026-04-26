-- Student Society: profile visibility and public activity controls

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'profile_visibility'
  ) THEN
    CREATE TYPE public.profile_visibility AS ENUM (
      'everyone',
      'followers',
      'followers_and_following',
      'following',
      'no_one'
    );
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility public.profile_visibility NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS show_profile_stats BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_study_activity BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_job_activity BOOLEAN NOT NULL DEFAULT TRUE;
