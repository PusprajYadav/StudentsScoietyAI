-- Student Society: post shares and engagement policies

CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_post_id ON public.shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON public.shares(user_id);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_read_all" ON public.shares;
CREATE POLICY "shares_read_all"
ON public.shares FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "shares_insert_self" ON public.shares;
CREATE POLICY "shares_insert_self"
ON public.shares FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = shares.post_id
      AND p.moderation_state = 'published'
      AND (
        p.visibility_scope = 'discussion'
        OR public.can_view_community(p.community_id)
      )
  )
);

DROP POLICY IF EXISTS "shares_delete_self_or_admin" ON public.shares;
CREATE POLICY "shares_delete_self_or_admin"
ON public.shares FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());
