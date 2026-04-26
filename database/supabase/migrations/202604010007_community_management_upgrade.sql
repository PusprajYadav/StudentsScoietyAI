-- Student Society: advanced community creation, access control, and moderation

DO $$
BEGIN
  CREATE TYPE public.community_join_policy AS ENUM ('open', 'approval_required');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.community_feed_visibility AS ENUM ('community_only', 'discussion_and_community');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.community_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.community_membership_status AS ENUM ('pending', 'active', 'banned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS join_policy public.community_join_policy NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS requires_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_hint TEXT,
  ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS feed_visibility public.community_feed_visibility NOT NULL DEFAULT 'community_only';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'communities_password_version_positive'
      AND conrelid = 'public.communities'::regclass
  ) THEN
    ALTER TABLE public.communities
      ADD CONSTRAINT communities_password_version_positive
      CHECK (password_version > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_access_secrets (
  community_id UUID PRIMARY KEY REFERENCES public.communities(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS role public.community_member_role NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status public.community_membership_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS joined_via_password_version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_members_joined_via_password_version_positive'
      AND conrelid = 'public.community_members'::regclass
  ) THEN
    ALTER TABLE public.community_members
      ADD CONSTRAINT community_members_joined_via_password_version_positive
      CHECK (joined_via_password_version > 0);
  END IF;
END $$;

UPDATE public.community_members AS cm
SET
  role = CASE
    WHEN c.created_by IS NOT NULL AND cm.user_id = c.created_by THEN 'owner'::public.community_member_role
    ELSE COALESCE(cm.role, 'member'::public.community_member_role)
  END,
  status = COALESCE(cm.status, 'active'::public.community_membership_status),
  requested_at = COALESCE(cm.requested_at, cm.created_at, timezone('utc', now())),
  accepted_at = COALESCE(cm.accepted_at, cm.created_at, timezone('utc', now())),
  joined_via_password_version = GREATEST(COALESCE(cm.joined_via_password_version, 1), 1)
FROM public.communities AS c
WHERE c.id = cm.community_id;

INSERT INTO public.community_members (
  community_id,
  user_id,
  role,
  status,
  requested_at,
  accepted_at,
  accepted_by,
  joined_via_password_version
)
SELECT
  c.id,
  c.created_by,
  'owner'::public.community_member_role,
  'active'::public.community_membership_status,
  COALESCE(c.created_at, timezone('utc', now())),
  COALESCE(c.created_at, timezone('utc', now())),
  c.created_by,
  GREATEST(COALESCE(c.password_version, 1), 1)
FROM public.communities AS c
WHERE c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.community_members AS cm
    WHERE cm.community_id = c.id
      AND cm.user_id = c.created_by
  );

CREATE INDEX IF NOT EXISTS idx_community_members_status
  ON public.community_members(community_id, status);

CREATE INDEX IF NOT EXISTS idx_community_members_role
  ON public.community_members(community_id, role);

DROP TRIGGER IF EXISTS community_members_set_updated_at ON public.community_members;
CREATE TRIGGER community_members_set_updated_at
BEFORE UPDATE ON public.community_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.coin_feature_settings (
  feature_key,
  feature_name,
  description,
  category,
  billing_model,
  coins_required,
  access_key,
  duration_days,
  is_enabled,
  sort_order
)
VALUES (
  'community_create',
  'Create Community',
  'Charge coins when a user creates a new community.',
  'social',
  'per_use',
  25,
  NULL,
  NULL,
  TRUE,
  15
)
ON CONFLICT (feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_community_member(
  target_community UUID,
  check_user UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE community_id = target_community
      AND user_id = check_user
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_owner(
  target_community UUID,
  check_user UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE community_id = target_community
      AND user_id = check_user
      AND status = 'active'
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_admin(
  target_community UUID,
  check_user UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(check_user)
    OR EXISTS (
      SELECT 1
      FROM public.community_members
      WHERE community_id = target_community
        AND user_id = check_user
        AND status = 'active'
        AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_discover_community(target_community UUID)
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
      AND (
        c.is_visible = TRUE
        OR public.is_admin()
        OR public.is_community_member(c.id)
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
          c.is_visible = TRUE
          AND c.join_policy = 'open'
          AND c.requires_password = FALSE
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.community_password_matches(
  target_community_id UUID,
  supplied_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  IF supplied_password IS NULL OR btrim(supplied_password) = '' THEN
    RETURN FALSE;
  END IF;

  SELECT cas.password_hash
  INTO stored_hash
  FROM public.community_access_secrets AS cas
  WHERE cas.community_id = target_community_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN crypt(supplied_password, stored_hash) = stored_hash;
END;
$$;

CREATE OR REPLACE FUNCTION private.charge_community_create_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM private.charge_feature_on_insert(
    'community_create',
    NEW.created_by,
    NEW.id,
    'community',
    format('Community created: %s', COALESCE(NULLIF(btrim(NEW.name), ''), 'Community')),
    jsonb_build_object(
      'community_id', NEW.id,
      'community_slug', NEW.slug
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS communities_charge_coins_before_insert ON public.communities;
CREATE TRIGGER communities_charge_coins_before_insert
BEFORE INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION private.charge_community_create_coins();

CREATE OR REPLACE FUNCTION public.create_community_with_access(
  target_name TEXT,
  target_slug TEXT,
  target_description TEXT DEFAULT '',
  target_hero_color TEXT DEFAULT '#2563eb',
  target_posting_modes public.discussion_kind[] DEFAULT ARRAY['study', 'job', 'anonymous']::public.discussion_kind[],
  target_join_policy public.community_join_policy DEFAULT 'open',
  target_requires_password BOOLEAN DEFAULT FALSE,
  target_password TEXT DEFAULT NULL,
  target_password_hint TEXT DEFAULT NULL,
  target_feed_visibility public.community_feed_visibility DEFAULT 'community_only'
)
RETURNS public.communities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  community_row public.communities;
  normalized_name TEXT := btrim(COALESCE(target_name, ''));
  normalized_slug TEXT := lower(btrim(COALESCE(target_slug, '')));
  normalized_description TEXT := btrim(COALESCE(target_description, ''));
  normalized_password TEXT := NULLIF(btrim(COALESCE(target_password, '')), '');
  normalized_posting_modes public.discussion_kind[] := COALESCE(target_posting_modes, ARRAY['study', 'job', 'anonymous']::public.discussion_kind[]);
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a community.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_user_post(actor_id) THEN
    RAISE EXCEPTION 'Your account cannot create communities right now.'
      USING ERRCODE = 'P0001';
  END IF;

  IF length(normalized_name) < 3 THEN
    RAISE EXCEPTION 'Community name must be at least 3 characters.'
      USING ERRCODE = 'P0001';
  END IF;

  IF normalized_slug !~ '^[a-z0-9-]{3,40}$' THEN
    RAISE EXCEPTION 'Community slug must use lowercase letters, numbers, and hyphens.'
      USING ERRCODE = 'P0001';
  END IF;

  normalized_posting_modes := ARRAY(
    SELECT DISTINCT item
    FROM unnest(normalized_posting_modes) AS item
  );

  IF COALESCE(array_length(normalized_posting_modes, 1), 0) = 0 THEN
    normalized_posting_modes := ARRAY['study', 'job', 'anonymous']::public.discussion_kind[];
  END IF;

  IF target_requires_password AND normalized_password IS NULL THEN
    RAISE EXCEPTION 'Add a password to protect this community.'
      USING ERRCODE = 'P0001';
  END IF;

  IF normalized_password IS NOT NULL AND length(normalized_password) < 4 THEN
    RAISE EXCEPTION 'Community password must be at least 4 characters.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.communities (
    name,
    slug,
    description,
    hero_color,
    posting_modes,
    created_by,
    join_policy,
    requires_password,
    password_hint,
    feed_visibility,
    password_version
  )
  VALUES (
    normalized_name,
    normalized_slug,
    normalized_description,
    COALESCE(NULLIF(btrim(target_hero_color), ''), '#2563eb'),
    normalized_posting_modes,
    actor_id,
    COALESCE(target_join_policy, 'open'::public.community_join_policy),
    COALESCE(target_requires_password, FALSE),
    CASE
      WHEN COALESCE(target_requires_password, FALSE) THEN NULLIF(btrim(COALESCE(target_password_hint, '')), '')
      ELSE NULL
    END,
    COALESCE(target_feed_visibility, 'community_only'::public.community_feed_visibility),
    1
  )
  RETURNING *
  INTO community_row;

  IF COALESCE(target_requires_password, FALSE) THEN
    INSERT INTO public.community_access_secrets (
      community_id,
      password_hash,
      updated_by
    )
    VALUES (
      community_row.id,
      crypt(normalized_password, gen_salt('bf')),
      actor_id
    );
  END IF;

  INSERT INTO public.community_members (
    community_id,
    user_id,
    role,
    status,
    requested_at,
    accepted_at,
    accepted_by,
    joined_via_password_version
  )
  VALUES (
    community_row.id,
    actor_id,
    'owner'::public.community_member_role,
    'active'::public.community_membership_status,
    timezone('utc', now()),
    timezone('utc', now()),
    actor_id,
    community_row.password_version
  )
  ON CONFLICT (community_id, user_id) DO UPDATE
  SET
    role = 'owner'::public.community_member_role,
    status = 'active'::public.community_membership_status,
    accepted_at = timezone('utc', now()),
    accepted_by = actor_id,
    banned_reason = NULL,
    joined_via_password_version = community_row.password_version;

  RETURN community_row;
END;
$$;

-- ============================================================================
-- CRITICAL FIX: Drop ALL old overloads of request_or_join_community.
-- PostgREST returns 400 when it finds multiple function signatures with the
-- same name but different return types (TABLE vs JSONB).  We must drop every
-- possible old signature before creating the canonical JSONB version.
-- ============================================================================
DO $$
BEGIN
  -- Drop the old TABLE-returning overload (uuid, text) if it exists
  DROP FUNCTION IF EXISTS public.request_or_join_community(UUID, TEXT);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Also try dropping without argument names in case of mismatch
DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.request_or_join_community(uuid, text);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.request_or_join_community(
  p_community_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     UUID := auth.uid();
  v_community    public.communities;
  v_membership   public.community_members;
BEGIN
  -- 1. Must be signed in
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to join communities.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Fetch the community
  SELECT c.*
  INTO v_community
  FROM public.communities AS c
  WHERE c.id = p_community_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This community could not be found.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Check existing membership
  SELECT cm.*
  INTO v_membership
  FROM public.community_members AS cm
  WHERE cm.community_id = p_community_id
    AND cm.user_id = v_actor_id;

  IF FOUND THEN
    IF v_membership.status = 'banned'::public.community_membership_status THEN
      RAISE EXCEPTION 'You are banned from this community.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_membership.status = 'active'::public.community_membership_status THEN
      RETURN jsonb_build_object(
        'join_result', 'already_member',
        'member_status', 'active',
        'community_id', p_community_id::text
      );
    END IF;

    IF v_membership.status = 'pending'::public.community_membership_status THEN
      RETURN jsonb_build_object(
        'join_result', 'pending',
        'member_status', 'pending',
        'community_id', p_community_id::text
      );
    END IF;
  END IF;

  -- 4. Password check (if required)
  IF v_community.requires_password
     AND NOT private.community_password_matches(p_community_id, p_password) THEN
    RAISE EXCEPTION 'Incorrect community password.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Approval-required communities → insert as pending
  IF v_community.join_policy = 'approval_required'::public.community_join_policy THEN
    INSERT INTO public.community_members (
      community_id, user_id, role, status,
      requested_at, accepted_at, accepted_by,
      banned_reason, joined_via_password_version
    ) VALUES (
      p_community_id,
      v_actor_id,
      'member'::public.community_member_role,
      'pending'::public.community_membership_status,
      timezone('utc', now()),
      NULL,
      NULL,
      NULL,
      v_community.password_version
    )
    ON CONFLICT (community_id, user_id) DO UPDATE SET
      role   = 'member'::public.community_member_role,
      status = 'pending'::public.community_membership_status,
      requested_at = timezone('utc', now()),
      accepted_at  = NULL,
      accepted_by  = NULL,
      banned_reason = NULL,
      joined_via_password_version = v_community.password_version;

    RETURN jsonb_build_object(
      'join_result', 'pending',
      'member_status', 'pending',
      'community_id', p_community_id::text
    );
  END IF;

  -- 6. Open communities → insert as active
  INSERT INTO public.community_members (
    community_id, user_id, role, status,
    requested_at, accepted_at, accepted_by,
    banned_reason, joined_via_password_version
  ) VALUES (
    p_community_id,
    v_actor_id,
    'member'::public.community_member_role,
    'active'::public.community_membership_status,
    timezone('utc', now()),
    timezone('utc', now()),
    v_actor_id,
    NULL,
    v_community.password_version
  )
  ON CONFLICT (community_id, user_id) DO UPDATE SET
    status = 'active'::public.community_membership_status,
    role   = CASE
      WHEN public.community_members.role = 'owner'::public.community_member_role THEN 'owner'::public.community_member_role
      WHEN public.community_members.role = 'admin'::public.community_member_role THEN 'admin'::public.community_member_role
      ELSE 'member'::public.community_member_role
    END,
    accepted_at = timezone('utc', now()),
    accepted_by = v_actor_id,
    banned_reason = NULL,
    joined_via_password_version = v_community.password_version;

  RETURN jsonb_build_object(
    'join_result', 'joined',
    'member_status', 'active',
    'community_id', p_community_id::text
  );
END;
$$;
-- ============================================================================
-- CRITICAL: Drop ALL old signatures of leave_community_membership.
-- PostgREST 400 = multiple overloads or stale function cache.
-- ============================================================================
DROP FUNCTION IF EXISTS public.leave_community_membership(UUID);
DROP FUNCTION IF EXISTS public.leave_community_membership(uuid);

CREATE OR REPLACE FUNCTION public.leave_community_membership(
  p_community_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_membership public.community_members;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage your community membership.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT cm.*
  INTO v_membership
  FROM public.community_members AS cm
  WHERE cm.community_id = p_community_id
    AND cm.user_id = v_actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a member of this community.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_membership.role = 'owner'::public.community_member_role
     AND v_membership.status = 'active'::public.community_membership_status THEN
    RAISE EXCEPTION 'Community owners cannot leave until another admin is assigned.'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.community_members AS cm
  WHERE cm.community_id = p_community_id
    AND cm.user_id = v_actor_id;

  RETURN CASE
    WHEN v_membership.status = 'pending'::public.community_membership_status THEN 'request_cancelled'
    ELSE 'left'
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_community_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_community_membership(UUID) TO anon;

CREATE OR REPLACE FUNCTION public.update_community_settings(
  target_community_id UUID,
  target_name TEXT DEFAULT NULL,
  target_description TEXT DEFAULT NULL,
  target_hero_color TEXT DEFAULT NULL,
  target_posting_modes public.discussion_kind[] DEFAULT NULL,
  target_join_policy public.community_join_policy DEFAULT NULL,
  target_requires_password BOOLEAN DEFAULT NULL,
  target_password TEXT DEFAULT NULL,
  target_password_hint TEXT DEFAULT NULL,
  target_feed_visibility public.community_feed_visibility DEFAULT NULL,
  target_is_visible BOOLEAN DEFAULT NULL
)
RETURNS public.communities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  community_row public.communities;
  next_requires_password BOOLEAN;
  next_password_hint TEXT;
  next_password_version INTEGER;
  normalized_password TEXT := NULLIF(btrim(COALESCE(target_password, '')), '');
  secret_exists BOOLEAN;
  normalized_posting_modes public.discussion_kind[];
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage community settings.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_community_admin(target_community_id, actor_id) THEN
    RAISE EXCEPTION 'Only community admins can manage this community.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO community_row
  FROM public.communities
  WHERE id = target_community_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This community could not be found.'
      USING ERRCODE = 'P0001';
  END IF;

  next_requires_password := COALESCE(target_requires_password, community_row.requires_password);
  next_password_version := community_row.password_version;

  SELECT EXISTS (
    SELECT 1
    FROM public.community_access_secrets
    WHERE community_id = target_community_id
  )
  INTO secret_exists;

  IF next_requires_password THEN
    IF normalized_password IS NOT NULL THEN
      INSERT INTO public.community_access_secrets (
        community_id,
        password_hash,
        updated_by,
        updated_at
      )
      VALUES (
        target_community_id,
        crypt(normalized_password, gen_salt('bf')),
        actor_id,
        timezone('utc', now())
      )
      ON CONFLICT (community_id) DO UPDATE
      SET
        password_hash = EXCLUDED.password_hash,
        updated_by = actor_id,
        updated_at = timezone('utc', now());

      next_password_version := community_row.password_version + 1;
    ELSIF NOT secret_exists THEN
      RAISE EXCEPTION 'Add a password before turning password protection on.'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    DELETE FROM public.community_access_secrets
    WHERE community_id = target_community_id;
  END IF;

  next_password_hint := CASE
    WHEN next_requires_password THEN NULLIF(btrim(COALESCE(target_password_hint, community_row.password_hint, '')), '')
    ELSE NULL
  END;

  normalized_posting_modes := CASE
    WHEN target_posting_modes IS NULL OR COALESCE(array_length(target_posting_modes, 1), 0) = 0 THEN community_row.posting_modes
    ELSE ARRAY(
      SELECT DISTINCT item
      FROM unnest(target_posting_modes) AS item
    )
  END;

  UPDATE public.communities
  SET
    name = COALESCE(NULLIF(btrim(target_name), ''), community_row.name),
    description = COALESCE(btrim(target_description), community_row.description),
    hero_color = COALESCE(NULLIF(btrim(target_hero_color), ''), community_row.hero_color),
    posting_modes = normalized_posting_modes,
    join_policy = COALESCE(target_join_policy, community_row.join_policy),
    requires_password = next_requires_password,
    password_hint = next_password_hint,
    password_version = next_password_version,
    feed_visibility = COALESCE(target_feed_visibility, community_row.feed_visibility),
    is_visible = COALESCE(target_is_visible, community_row.is_visible)
  WHERE id = target_community_id
  RETURNING *
  INTO community_row;

  RETURN community_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_community_member_request(
  target_community_id UUID,
  target_user_id UUID
)
RETURNS public.community_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  membership_row public.community_members;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage community requests.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_community_admin(target_community_id, actor_id) THEN
    RAISE EXCEPTION 'Only community admins can accept requests.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.community_members
  SET
    status = 'active',
    accepted_at = timezone('utc', now()),
    accepted_by = actor_id,
    banned_reason = NULL
  WHERE community_id = target_community_id
    AND user_id = target_user_id
    AND status = 'pending'
  RETURNING *
  INTO membership_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This join request is no longer pending.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN membership_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_community_member_request(
  target_community_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage community requests.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_community_admin(target_community_id, actor_id) THEN
    RAISE EXCEPTION 'Only community admins can reject requests.'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.community_members
  WHERE community_id = target_community_id
    AND user_id = target_user_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_community_member(
  target_community_id UUID,
  target_user_id UUID,
  should_ban BOOLEAN DEFAULT FALSE,
  removal_reason TEXT DEFAULT NULL
)
RETURNS public.community_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  actor_membership public.community_members;
  target_membership public.community_members;
  community_row public.communities;
  result_row public.community_members;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage community members.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_community_admin(target_community_id, actor_id) THEN
    RAISE EXCEPTION 'Only community admins can remove members.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO community_row
  FROM public.communities
  WHERE id = target_community_id;

  SELECT *
  INTO actor_membership
  FROM public.community_members
  WHERE community_id = target_community_id
    AND user_id = actor_id;

  SELECT *
  INTO target_membership
  FROM public.community_members
  WHERE community_id = target_community_id
    AND user_id = target_user_id;

  IF should_ban THEN
    IF target_user_id = COALESCE(community_row.created_by, '00000000-0000-0000-0000-000000000000'::uuid) AND NOT public.is_admin(actor_id) THEN
      RAISE EXCEPTION 'Community owners cannot be banned here.'
        USING ERRCODE = 'P0001';
    END IF;

    IF target_membership.role = 'admin'
      AND actor_membership.role <> 'owner'
      AND NOT public.is_admin(actor_id) THEN
      RAISE EXCEPTION 'Only owners can ban other community admins.'
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.community_members (
      community_id,
      user_id,
      role,
      status,
      requested_at,
      accepted_at,
      accepted_by,
      banned_reason,
      joined_via_password_version
    )
    VALUES (
      target_community_id,
      target_user_id,
      'member'::public.community_member_role,
      'banned'::public.community_membership_status,
      timezone('utc', now()),
      NULL,
      actor_id,
      NULLIF(btrim(COALESCE(removal_reason, '')), ''),
      GREATEST(COALESCE(community_row.password_version, 1), 1)
    )
    ON CONFLICT (community_id, user_id) DO UPDATE
    SET
      status = 'banned'::public.community_membership_status,
      role = CASE WHEN public.community_members.role = 'owner'::public.community_member_role THEN 'owner'::public.community_member_role ELSE 'member'::public.community_member_role END,
      accepted_at = NULL,
      accepted_by = actor_id,
      banned_reason = NULLIF(btrim(COALESCE(removal_reason, '')), ''),
      joined_via_password_version = GREATEST(COALESCE(community_row.password_version, 1), 1)
    RETURNING *
    INTO result_row;

    RETURN result_row;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This member could not be found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF target_membership.role = 'owner' THEN
    RAISE EXCEPTION 'Community owners cannot be removed here.'
      USING ERRCODE = 'P0001';
  END IF;

  IF target_membership.role = 'admin'
    AND actor_membership.role <> 'owner'
    AND NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'Only owners can remove other community admins.'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.community_members
  WHERE community_id = target_community_id
    AND user_id = target_user_id
  RETURNING *
  INTO result_row;

  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_community_member_admin_state(
  target_community_id UUID,
  target_user_id UUID,
  make_admin BOOLEAN
)
RETURNS public.community_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  actor_membership public.community_members;
  target_membership public.community_members;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage community roles.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_community_admin(target_community_id, actor_id) THEN
    RAISE EXCEPTION 'Only community admins can update roles.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO actor_membership
  FROM public.community_members
  WHERE community_id = target_community_id
    AND user_id = actor_id;

  IF actor_membership.role <> 'owner' AND NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'Only owners can assign community admins.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO target_membership
  FROM public.community_members
  WHERE community_id = target_community_id
    AND user_id = target_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only active members can be promoted.'
      USING ERRCODE = 'P0001';
  END IF;

  IF target_membership.role = 'owner' THEN
    RAISE EXCEPTION 'Community owner role cannot be changed here.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.community_members
  SET role = CASE WHEN make_admin THEN 'admin'::public.community_member_role ELSE 'member'::public.community_member_role END
  WHERE community_id = target_community_id
    AND user_id = target_user_id
  RETURNING *
  INTO target_membership;

  RETURN target_membership;
END;
$$;

ALTER TABLE public.community_access_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communities_read_visible_or_member" ON public.communities;
CREATE POLICY "communities_read_visible_or_member"
ON public.communities FOR SELECT
USING (public.can_discover_community(id));

DROP POLICY IF EXISTS "community_members_read_visible" ON public.community_members;
DROP POLICY IF EXISTS "community_members_read_self_or_admin" ON public.community_members;
CREATE POLICY "community_members_read_self_or_admin"
ON public.community_members FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin()
  OR public.is_community_admin(community_id)
);

-- Drop the old INSERT policy — the SECURITY DEFINER function handles inserts
DROP POLICY IF EXISTS "community_members_join_self" ON public.community_members;

DROP POLICY IF EXISTS "community_members_leave_self_or_admin" ON public.community_members;
CREATE POLICY "community_members_leave_self_or_admin"
ON public.community_members FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

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
      AND public.is_community_member(community_id, auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "comments_insert_author_with_access" ON public.comments;
CREATE POLICY "comments_insert_author_with_access"
ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND public.can_user_post(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.posts AS p
    WHERE p.id = comments.post_id
      AND p.moderation_state = 'published'
      AND (
        p.visibility_scope = 'discussion'
        OR public.is_community_member(p.community_id, auth.uid())
      )
  )
);
