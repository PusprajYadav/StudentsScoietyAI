-- Student Society: helper functions, row level security, and moderation-aware access policies

CREATE OR REPLACE FUNCTION public.is_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = check_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = check_user
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_user_post(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user
      AND is_banned = FALSE
      AND can_post = TRUE
      AND (
        posting_restricted_until IS NULL
        OR posting_restricted_until < timezone('utc', now())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_community(target_community UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = target_community
      AND (
        c.is_visible = TRUE
        OR public.is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.community_members cm
          WHERE cm.community_id = c.id
            AND cm.user_id = auth.uid()
        )
      )
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all"
ON public.profiles FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "follows_read_all" ON public.follows;
CREATE POLICY "follows_read_all"
ON public.follows FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "follows_insert_self" ON public.follows;
CREATE POLICY "follows_insert_self"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_self_or_admin" ON public.follows;
CREATE POLICY "follows_delete_self_or_admin"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id OR public.is_admin());

DROP POLICY IF EXISTS "admin_roles_read_admins" ON public.admin_roles;
CREATE POLICY "admin_roles_read_admins"
ON public.admin_roles FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "admin_roles_manage_super_admin" ON public.admin_roles;
CREATE POLICY "admin_roles_manage_super_admin"
ON public.admin_roles FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "moderation_actions_read_admins" ON public.moderation_actions;
CREATE POLICY "moderation_actions_read_admins"
ON public.moderation_actions FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "moderation_actions_insert_admins" ON public.moderation_actions;
CREATE POLICY "moderation_actions_insert_admins"
ON public.moderation_actions FOR INSERT
WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

DROP POLICY IF EXISTS "communities_read_visible_or_member" ON public.communities;
CREATE POLICY "communities_read_visible_or_member"
ON public.communities FOR SELECT
USING (public.can_view_community(id));

DROP POLICY IF EXISTS "communities_admin_manage" ON public.communities;
CREATE POLICY "communities_admin_manage"
ON public.communities FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "community_members_read_visible" ON public.community_members;
CREATE POLICY "community_members_read_visible"
ON public.community_members FOR SELECT
USING (public.can_view_community(community_id));

DROP POLICY IF EXISTS "community_members_join_self" ON public.community_members;
CREATE POLICY "community_members_join_self"
ON public.community_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id = community_id
      AND c.is_visible = TRUE
  )
);

DROP POLICY IF EXISTS "community_members_leave_self_or_admin" ON public.community_members;
CREATE POLICY "community_members_leave_self_or_admin"
ON public.community_members FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "posts_read_published" ON public.posts;
CREATE POLICY "posts_read_published"
ON public.posts FOR SELECT
USING (
  moderation_state = 'published'
  AND (
    visibility_scope = 'discussion'
    OR public.can_view_community(community_id)
  )
  OR auth.uid() = author_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "posts_insert_author_with_access" ON public.posts;
CREATE POLICY "posts_insert_author_with_access"
ON public.posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND public.can_user_post(auth.uid())
  AND (
    (visibility_scope = 'discussion' AND community_id IS NULL)
    OR (
      visibility_scope = 'community'
      AND community_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.community_members cm
        WHERE cm.community_id = posts.community_id
          AND cm.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "posts_update_author_or_admin" ON public.posts;
CREATE POLICY "posts_update_author_or_admin"
ON public.posts FOR UPDATE
USING (auth.uid() = author_id OR public.is_admin())
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = author_id
    AND public.can_user_post(auth.uid())
  )
);

DROP POLICY IF EXISTS "posts_delete_author_or_admin" ON public.posts;
CREATE POLICY "posts_delete_author_or_admin"
ON public.posts FOR DELETE
USING (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "comments_read_visible_posts" ON public.comments;
CREATE POLICY "comments_read_visible_posts"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = comments.post_id
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

DROP POLICY IF EXISTS "comments_insert_author_with_access" ON public.comments;
CREATE POLICY "comments_insert_author_with_access"
ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND public.can_user_post(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = comments.post_id
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

DROP POLICY IF EXISTS "comments_update_author_or_admin" ON public.comments;
CREATE POLICY "comments_update_author_or_admin"
ON public.comments FOR UPDATE
USING (auth.uid() = author_id OR public.is_admin())
WITH CHECK (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "comments_delete_author_or_admin" ON public.comments;
CREATE POLICY "comments_delete_author_or_admin"
ON public.comments FOR DELETE
USING (auth.uid() = author_id OR public.is_admin());

DROP POLICY IF EXISTS "likes_read_all" ON public.likes;
CREATE POLICY "likes_read_all"
ON public.likes FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "likes_insert_self" ON public.likes;
CREATE POLICY "likes_insert_self"
ON public.likes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = likes.post_id
      AND p.moderation_state = 'published'
  )
);

DROP POLICY IF EXISTS "likes_delete_self_or_admin" ON public.likes;
CREATE POLICY "likes_delete_self_or_admin"
ON public.likes FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

