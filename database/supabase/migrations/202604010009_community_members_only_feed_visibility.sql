-- Student Society: add joined-members-only post visibility for communities

ALTER TYPE public.community_feed_visibility
ADD VALUE IF NOT EXISTS 'members_only';

CREATE OR REPLACE FUNCTION public.can_view_community_posts(target_community UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communities AS c
    WHERE c.id = target_community
      AND NOT EXISTS (
        SELECT 1
        FROM public.community_members AS banned_member
        WHERE banned_member.community_id = c.id
          AND banned_member.user_id = auth.uid()
          AND banned_member.status = 'banned'
      )
      AND (
        public.is_admin()
        OR public.is_community_member(c.id)
        OR (
          c.feed_visibility <> 'members_only'::public.community_feed_visibility
          AND c.is_visible = TRUE
          AND c.join_policy = 'open'
          AND c.requires_password = FALSE
        )
      )
  );
$$;

DROP POLICY IF EXISTS "posts_read_published" ON public.posts;
CREATE POLICY "posts_read_published"
ON public.posts FOR SELECT
USING (
  (
    moderation_state = 'published'
    AND (
      visibility_scope = 'discussion'
      OR public.can_view_community_posts(community_id)
    )
  )
  OR auth.uid() = author_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "comments_read_visible_posts" ON public.comments;
CREATE POLICY "comments_read_visible_posts"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = comments.post_id
      AND (
        (p.visibility_scope = 'discussion' AND p.moderation_state = 'published')
        OR (
          p.visibility_scope = 'community'
          AND p.moderation_state = 'published'
          AND public.can_view_community_posts(p.community_id)
        )
      )
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "likes_read_visible_posts" ON public.likes;
CREATE POLICY "likes_read_visible_posts"
ON public.likes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = likes.post_id
      AND (
        (p.moderation_state = 'published' AND (p.visibility_scope = 'discussion' OR public.can_view_community_posts(p.community_id)))
        OR p.author_id = auth.uid()
      )
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "likes_insert_self" ON public.likes;
CREATE POLICY "likes_insert_self"
ON public.likes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = likes.post_id
      AND p.moderation_state = 'published'
      AND (
        p.visibility_scope = 'discussion'
        OR public.can_view_community_posts(p.community_id)
      )
  )
);

DROP POLICY IF EXISTS "shares_read_visible_posts" ON public.shares;
CREATE POLICY "shares_read_visible_posts"
ON public.shares FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = shares.post_id
      AND (
        (p.moderation_state = 'published' AND (p.visibility_scope = 'discussion' OR public.can_view_community_posts(p.community_id)))
        OR p.author_id = auth.uid()
      )
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "shares_insert_self" ON public.shares;
CREATE POLICY "shares_insert_self"
ON public.shares FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = shares.post_id
      AND p.moderation_state = 'published'
      AND (
        p.visibility_scope = 'discussion'
        OR public.can_view_community_posts(p.community_id)
      )
  )
);

DROP POLICY IF EXISTS "poll_votes_read_visible_posts" ON public.poll_votes;
CREATE POLICY "poll_votes_read_visible_posts"
ON public.poll_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = poll_votes.post_id
      AND (
        (p.visibility_scope = 'discussion' AND p.moderation_state = 'published')
        OR (
          p.visibility_scope = 'community'
          AND p.moderation_state = 'published'
          AND public.can_view_community_posts(p.community_id)
        )
      )
  )
  OR public.is_admin()
);
