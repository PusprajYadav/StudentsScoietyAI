-- Student Society: richer posts, poll voting, notifications, profile views, and platform settings

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'post_type'
  ) THEN
    CREATE TYPE public.post_type AS ENUM ('standard', 'poll');
  END IF;
END $$;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type public.post_type NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_name TEXT,
  ADD COLUMN IF NOT EXISTS pdf_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS pdf_page_count INTEGER,
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS poll_question TEXT,
  ADD COLUMN IF NOT EXISTS poll_options TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.posts
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND coalesce(array_length(image_urls, 1), 0) = 0;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON public.poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow', 'post_like', 'post_comment', 'comment_reply', 'profile_view')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (viewer_id, viewed_profile_id),
  CHECK (viewer_id <> viewed_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_profile_id ON public.profile_views(viewed_profile_id, last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON public.profile_views(viewer_id, last_viewed_at DESC);

DROP TRIGGER IF EXISTS profile_views_set_updated_at ON public.profile_views;
CREATE TRIGGER profile_views_set_updated_at
BEFORE UPDATE ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  max_images_per_post INTEGER NOT NULL DEFAULT 5 CHECK (max_images_per_post BETWEEN 1 AND 10),
  max_pdf_size_mb INTEGER NOT NULL DEFAULT 10 CHECK (max_pdf_size_mb BETWEEN 1 AND 50),
  enable_profile_view_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS platform_settings_set_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_set_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_settings (
  id,
  max_images_per_post,
  max_pdf_size_mb,
  enable_profile_view_notifications
)
VALUES (1, 5, 10, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_votes_read_visible_posts" ON public.poll_votes;
CREATE POLICY "poll_votes_read_visible_posts"
ON public.poll_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = poll_votes.post_id
      AND (
        (p.visibility_scope = 'discussion' AND p.moderation_state = 'published')
        OR (
          p.visibility_scope = 'community'
          AND p.moderation_state = 'published'
          AND public.can_view_community(p.community_id)
        )
      )
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "poll_votes_insert_self" ON public.poll_votes;
CREATE POLICY "poll_votes_insert_self"
ON public.poll_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.can_user_post(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = poll_votes.post_id
      AND p.post_type = 'poll'
      AND p.moderation_state = 'published'
      AND (
        p.visibility_scope = 'discussion'
        OR EXISTS (
          SELECT 1
          FROM public.community_members cm
          WHERE cm.community_id = p.community_id
            AND cm.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "poll_votes_update_self_or_admin" ON public.poll_votes;
CREATE POLICY "poll_votes_update_self_or_admin"
ON public.poll_votes FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "poll_votes_delete_self_or_admin" ON public.poll_votes;
CREATE POLICY "poll_votes_delete_self_or_admin"
ON public.poll_votes FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notifications_read_recipient_or_admin" ON public.notifications;
CREATE POLICY "notifications_read_recipient_or_admin"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id OR public.is_admin());

DROP POLICY IF EXISTS "notifications_insert_actor_or_admin" ON public.notifications;
CREATE POLICY "notifications_insert_actor_or_admin"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() = actor_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "notifications_update_recipient_or_admin" ON public.notifications;
CREATE POLICY "notifications_update_recipient_or_admin"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id OR public.is_admin())
WITH CHECK (auth.uid() = recipient_id OR public.is_admin());

DROP POLICY IF EXISTS "notifications_delete_admin_only" ON public.notifications;
CREATE POLICY "notifications_delete_admin_only"
ON public.notifications FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "profile_views_read_related_or_admin" ON public.profile_views;
CREATE POLICY "profile_views_read_related_or_admin"
ON public.profile_views FOR SELECT
USING (
  auth.uid() = viewer_id
  OR auth.uid() = viewed_profile_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "profile_views_insert_self" ON public.profile_views;
CREATE POLICY "profile_views_insert_self"
ON public.profile_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id AND viewer_id <> viewed_profile_id);

DROP POLICY IF EXISTS "profile_views_update_self_or_admin" ON public.profile_views;
CREATE POLICY "profile_views_update_self_or_admin"
ON public.profile_views FOR UPDATE
USING (auth.uid() = viewer_id OR public.is_admin())
WITH CHECK (auth.uid() = viewer_id OR public.is_admin());

DROP POLICY IF EXISTS "platform_settings_read_all" ON public.platform_settings;
CREATE POLICY "platform_settings_read_all"
ON public.platform_settings FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "platform_settings_insert_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_insert_admin"
ON public.platform_settings FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "platform_settings_update_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_update_admin"
ON public.platform_settings FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());
