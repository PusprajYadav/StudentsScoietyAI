-- Student Society: per-user community visibility preferences for discussion feed

CREATE TABLE IF NOT EXISTS public.profile_hidden_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_hidden_communities_profile_id
ON public.profile_hidden_communities(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_hidden_communities_community_id
ON public.profile_hidden_communities(community_id);

ALTER TABLE public.profile_hidden_communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_hidden_communities_read_self_or_admin" ON public.profile_hidden_communities;
CREATE POLICY "profile_hidden_communities_read_self_or_admin"
ON public.profile_hidden_communities FOR SELECT
USING (auth.uid() = profile_id OR public.is_admin());

DROP POLICY IF EXISTS "profile_hidden_communities_insert_self_or_admin" ON public.profile_hidden_communities;
CREATE POLICY "profile_hidden_communities_insert_self_or_admin"
ON public.profile_hidden_communities FOR INSERT
WITH CHECK (auth.uid() = profile_id OR public.is_admin());

DROP POLICY IF EXISTS "profile_hidden_communities_delete_self_or_admin" ON public.profile_hidden_communities;
CREATE POLICY "profile_hidden_communities_delete_self_or_admin"
ON public.profile_hidden_communities FOR DELETE
USING (auth.uid() = profile_id OR public.is_admin());
