-- Student Society: communities, memberships, posts, comments, likes

CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  description TEXT NOT NULL DEFAULT '',
  hero_color TEXT NOT NULL DEFAULT '#0f766e',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  posting_modes public.discussion_kind[] NOT NULL DEFAULT ARRAY['study', 'job', 'anonymous']::public.discussion_kind[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_communities_visibility ON public.communities(is_visible);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities(slug);

DROP TRIGGER IF EXISTS communities_set_updated_at ON public.communities;
CREATE TRIGGER communities_set_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  visibility_scope public.post_scope NOT NULL DEFAULT 'discussion',
  discussion_kind public.discussion_kind NOT NULL DEFAULT 'study',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_state public.moderation_state NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (
    (visibility_scope = 'discussion' AND community_id IS NULL)
    OR
    (visibility_scope = 'community' AND community_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_scope_kind ON public.posts(visibility_scope, discussion_kind);
CREATE INDEX IF NOT EXISTS idx_posts_moderation_state ON public.posts(moderation_state);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);

DROP TRIGGER IF EXISTS comments_set_updated_at ON public.comments;
CREATE TRIGGER comments_set_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'moderation_actions_target_post_fkey'
      AND table_name = 'moderation_actions'
  ) THEN
    ALTER TABLE public.moderation_actions
      ADD CONSTRAINT moderation_actions_target_post_fkey
      FOREIGN KEY (target_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'moderation_actions_target_community_fkey'
      AND table_name = 'moderation_actions'
  ) THEN
    ALTER TABLE public.moderation_actions
      ADD CONSTRAINT moderation_actions_target_community_fkey
      FOREIGN KEY (target_community_id) REFERENCES public.communities(id) ON DELETE SET NULL;
  END IF;
END $$;
