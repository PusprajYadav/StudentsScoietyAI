-- Student Society: foundational extensions, enum types, and shared helpers

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'theme_preference') THEN
    CREATE TYPE public.theme_preference AS ENUM ('light', 'dark', 'system');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discussion_kind') THEN
    CREATE TYPE public.discussion_kind AS ENUM ('study', 'job', 'anonymous');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_scope') THEN
    CREATE TYPE public.post_scope AS ENUM ('discussion', 'community');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_state') THEN
    CREATE TYPE public.moderation_state AS ENUM ('published', 'hidden', 'flagged');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE public.admin_role AS ENUM ('super_admin', 'content_admin', 'community_admin', 'support_admin');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

