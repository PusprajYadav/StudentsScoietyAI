-- Student Society: profiles, follows, admin roles, moderation log

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  full_name TEXT NOT NULL DEFAULT '',
  headline TEXT,
  bio TEXT,
  campus TEXT,
  course TEXT,
  year_of_study TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  avatar_url TEXT,
  banner_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  can_post BOOLEAN NOT NULL DEFAULT TRUE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  posting_restricted_until TIMESTAMPTZ,
  moderation_note TEXT,
  theme_preference public.theme_preference NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_posting_access ON public.profiles(can_post, is_banned);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'support_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_post_id UUID,
  target_community_id UUID,
  action_type TEXT NOT NULL,
  action_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin_id ON public.moderation_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON public.moderation_actions(created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_username TEXT;
BEGIN
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));

  INSERT INTO public.profiles (
    id,
    username,
    full_name
  )
  VALUES (
    new.id,
    CASE
      WHEN requested_username ~ '^[a-z0-9_]{3,24}$' THEN requested_username
      ELSE 'student_' || substring(new.id::text, 1, 8)
    END,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

