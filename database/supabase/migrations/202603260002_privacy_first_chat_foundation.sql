-- Student Society: privacy-first chat foundation

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'chat_request_policy'
  ) THEN
    CREATE TYPE public.chat_request_policy AS ENUM (
      'everyone',
      'followers',
      'followers_and_following',
      'following',
      'no_one'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'chat_request_status'
  ) THEN
    CREATE TYPE public.chat_request_status AS ENUM (
      'pending',
      'accepted',
      'declined',
      'cancelled',
      'expired'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'chat_conversation_type'
  ) THEN
    CREATE TYPE public.chat_conversation_type AS ENUM ('direct');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'chat_message_kind'
  ) THEN
    CREATE TYPE public.chat_message_kind AS ENUM (
      'request_intro',
      'text',
      'image',
      'voice',
      'system'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'chat_media_kind'
  ) THEN
    CREATE TYPE public.chat_media_kind AS ENUM ('image', 'voice');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'chat_presence_status'
  ) THEN
    CREATE TYPE public.chat_presence_status AS ENUM ('online', 'offline');
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_request_policy public.chat_request_policy NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS enable_chat_request_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_message_notifications BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'follow',
      'post_like',
      'post_comment',
      'comment_reply',
      'profile_view',
      'chat_request',
      'chat_message'
    )
  );

CREATE TABLE IF NOT EXISTS public.chat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocker_id ON public.chat_blocks(blocker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked_id ON public.chat_blocks(blocked_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type public.chat_conversation_type NOT NULL DEFAULT 'direct',
  direct_message_key TEXT UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_server_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (conversation_type <> 'direct' OR direct_message_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_activity
ON public.chat_conversations(last_server_activity_at DESC NULLS LAST, created_at DESC);

DROP TRIGGER IF EXISTS chat_conversations_set_updated_at ON public.chat_conversations;
CREATE TRIGGER chat_conversations_set_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id
ON public.chat_participants(user_id, conversation_id);

CREATE TABLE IF NOT EXISTS public.chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.chat_request_status NOT NULL DEFAULT 'pending',
  intro_message_client_id TEXT NOT NULL,
  intro_message_kind public.chat_message_kind NOT NULL DEFAULT 'request_intro',
  intro_envelope JSONB NOT NULL,
  accepted_conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()) + interval '14 days'),
  CHECK (sender_id <> recipient_id),
  CHECK (intro_message_kind = 'request_intro'),
  CHECK (jsonb_typeof(intro_envelope) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_sender_client_id
ON public.chat_requests(sender_id, intro_message_client_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_pending_pair
ON public.chat_requests (
  LEAST(sender_id::TEXT, recipient_id::TEXT),
  GREATEST(sender_id::TEXT, recipient_id::TEXT)
)
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_accepted_conversation
ON public.chat_requests(accepted_conversation_id)
WHERE accepted_conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_requests_recipient_status_created_at
ON public.chat_requests(recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_requests_sender_status_created_at
ON public.chat_requests(sender_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  installation_id TEXT NOT NULL,
  registration_id INTEGER,
  identity_key_public TEXT NOT NULL,
  signed_pre_key_public TEXT NOT NULL,
  signed_pre_key_signature TEXT NOT NULL,
  signed_pre_key_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, installation_id),
  CHECK (length(trim(identity_key_public)) > 0),
  CHECK (length(trim(signed_pre_key_public)) > 0),
  CHECK (length(trim(signed_pre_key_signature)) > 0),
  CHECK (length(trim(signed_pre_key_id)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_devices_one_primary_per_user
ON public.chat_devices(user_id)
WHERE is_primary = TRUE
  AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_devices_user_id_active
ON public.chat_devices(user_id, is_active, revoked_at, updated_at DESC);

DROP TRIGGER IF EXISTS chat_devices_set_updated_at ON public.chat_devices;
CREATE TRIGGER chat_devices_set_updated_at
BEFORE UPDATE ON public.chat_devices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.chat_device_one_time_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.chat_devices(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  claimed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (device_id, key_id),
  CHECK (length(trim(public_key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_device_one_time_keys_device_id
ON public.chat_device_one_time_keys(device_id, claimed_at, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_media_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_device_id UUID REFERENCES public.chat_devices(id) ON DELETE SET NULL,
  media_kind public.chat_media_kind NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'php_uploads',
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  sha256_hex TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  consumed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (length(trim(storage_path)) > 0),
  CHECK (length(trim(sha256_hex)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_media_blobs_owner_id
ON public.chat_media_blobs(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_media_blobs_expires_at
ON public.chat_media_blobs(expires_at);

CREATE TABLE IF NOT EXISTS public.chat_message_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.chat_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_device_id UUID NOT NULL REFERENCES public.chat_devices(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_device_id UUID NOT NULL REFERENCES public.chat_devices(id) ON DELETE CASCADE,
  client_message_id TEXT NOT NULL,
  message_kind public.chat_message_kind NOT NULL,
  payload JSONB NOT NULL,
  media_blob_id UUID REFERENCES public.chat_media_blobs(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  CHECK (sender_id <> recipient_id),
  CHECK (jsonb_typeof(payload) = 'object'),
  CHECK (
    (
      message_kind = 'request_intro'
      AND request_id IS NOT NULL
      AND conversation_id IS NULL
    )
    OR
    (
      message_kind <> 'request_intro'
      AND conversation_id IS NOT NULL
      AND request_id IS NULL
    )
  ),
  UNIQUE (recipient_device_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_envelopes_recipient_device
ON public.chat_message_envelopes(recipient_device_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_envelopes_recipient
ON public.chat_message_envelopes(recipient_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_envelopes_conversation
ON public.chat_message_envelopes(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_envelopes_request
ON public.chat_message_envelopes(request_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_envelopes_expires_at
ON public.chat_message_envelopes(expires_at);

CREATE TABLE IF NOT EXISTS public.chat_delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.chat_requests(id) ON DELETE CASCADE,
  client_message_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_device_id UUID NOT NULL REFERENCES public.chat_devices(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (sender_id <> recipient_id),
  UNIQUE (recipient_device_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_delivery_receipts_sender
ON public.chat_delivery_receipts(sender_id, delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_delivery_receipts_recipient
ON public.chat_delivery_receipts(recipient_id, delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_delivery_receipts_conversation
ON public.chat_delivery_receipts(conversation_id, delivered_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.chat_presence_status NOT NULL DEFAULT 'offline',
  last_heartbeat_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_chat_presence_expires_at ON public.chat_presence(expires_at);

DROP TRIGGER IF EXISTS chat_presence_set_updated_at ON public.chat_presence;
CREATE TRIGGER chat_presence_set_updated_at
BEFORE UPDATE ON public.chat_presence
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.chat_direct_message_key(user_a UUID, user_b UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(user_a::TEXT, user_b::TEXT) || ':' || GREATEST(user_a::TEXT, user_b::TEXT);
$$;

CREATE OR REPLACE FUNCTION public.can_user_send_chat_request(
  target_user UUID,
  requesting_user UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_policy public.chat_request_policy;
  requester_follows_target BOOLEAN := FALSE;
  target_follows_requester BOOLEAN := FALSE;
BEGIN
  IF target_user IS NULL OR requesting_user IS NULL OR target_user = requesting_user THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.chat_blocks
    WHERE (blocker_id = requesting_user AND blocked_id = target_user)
       OR (blocker_id = target_user AND blocked_id = requesting_user)
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT p.chat_request_policy
  INTO target_policy
  FROM public.profiles p
  WHERE p.id = target_user;

  IF target_policy IS NULL OR target_policy = 'no_one' THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.follows f
    WHERE f.follower_id = requesting_user
      AND f.following_id = target_user
  )
  INTO requester_follows_target;

  SELECT EXISTS (
    SELECT 1
    FROM public.follows f
    WHERE f.follower_id = target_user
      AND f.following_id = requesting_user
  )
  INTO target_follows_requester;

  IF target_policy = 'everyone' THEN
    RETURN TRUE;
  ELSIF target_policy = 'followers' THEN
    RETURN requester_follows_target;
  ELSIF target_policy = 'following' THEN
    RETURN target_follows_requester;
  ELSIF target_policy = 'followers_and_following' THEN
    RETURN requester_follows_target OR target_follows_requester;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_chat_conversation_from_envelope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.chat_conversations
    SET last_server_activity_at = NEW.sent_at,
        updated_at = timezone('utc', now())
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_envelopes_touch_conversation ON public.chat_message_envelopes;
CREATE TRIGGER chat_message_envelopes_touch_conversation
AFTER INSERT ON public.chat_message_envelopes
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_conversation_from_envelope();

ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_device_one_time_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_media_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_blocks_read_self_or_admin" ON public.chat_blocks;
CREATE POLICY "chat_blocks_read_self_or_admin"
ON public.chat_blocks FOR SELECT
USING (auth.uid() = blocker_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_blocks_insert_self" ON public.chat_blocks;
CREATE POLICY "chat_blocks_insert_self"
ON public.chat_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "chat_blocks_delete_self_or_admin" ON public.chat_blocks;
CREATE POLICY "chat_blocks_delete_self_or_admin"
ON public.chat_blocks FOR DELETE
USING (auth.uid() = blocker_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_conversations_read_participant_or_admin" ON public.chat_conversations;
CREATE POLICY "chat_conversations_read_participant_or_admin"
ON public.chat_conversations FOR SELECT
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = chat_conversations.id
      AND cp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "chat_participants_read_self_or_admin" ON public.chat_participants;
CREATE POLICY "chat_participants_read_self_or_admin"
ON public.chat_participants FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_requests_read_related_or_admin" ON public.chat_requests;
CREATE POLICY "chat_requests_read_related_or_admin"
ON public.chat_requests FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "chat_requests_insert_sender_if_allowed" ON public.chat_requests;
CREATE POLICY "chat_requests_insert_sender_if_allowed"
ON public.chat_requests FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.can_user_send_chat_request(recipient_id, sender_id)
);

DROP POLICY IF EXISTS "chat_devices_read_public_or_owner_or_admin" ON public.chat_devices;
CREATE POLICY "chat_devices_read_public_or_owner_or_admin"
ON public.chat_devices FOR SELECT
USING (
  (
    auth.uid() IS NOT NULL
    AND is_active = TRUE
    AND revoked_at IS NULL
  )
  OR auth.uid() = user_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "chat_devices_insert_self_or_admin" ON public.chat_devices;
CREATE POLICY "chat_devices_insert_self_or_admin"
ON public.chat_devices FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_devices_update_self_or_admin" ON public.chat_devices;
CREATE POLICY "chat_devices_update_self_or_admin"
ON public.chat_devices FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_devices_delete_self_or_admin" ON public.chat_devices;
CREATE POLICY "chat_devices_delete_self_or_admin"
ON public.chat_devices FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_device_one_time_keys_read_authenticated_or_admin" ON public.chat_device_one_time_keys;
CREATE POLICY "chat_device_one_time_keys_read_authenticated_or_admin"
ON public.chat_device_one_time_keys FOR SELECT
USING (auth.uid() IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS "chat_device_one_time_keys_insert_owner_or_admin" ON public.chat_device_one_time_keys;
CREATE POLICY "chat_device_one_time_keys_insert_owner_or_admin"
ON public.chat_device_one_time_keys FOR INSERT
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.chat_devices cd
    WHERE cd.id = chat_device_one_time_keys.device_id
      AND cd.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "chat_device_one_time_keys_update_owner_or_admin" ON public.chat_device_one_time_keys;
CREATE POLICY "chat_device_one_time_keys_update_owner_or_admin"
ON public.chat_device_one_time_keys FOR UPDATE
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.chat_devices cd
    WHERE cd.id = chat_device_one_time_keys.device_id
      AND cd.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.chat_devices cd
    WHERE cd.id = chat_device_one_time_keys.device_id
      AND cd.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "chat_device_one_time_keys_delete_owner_or_admin" ON public.chat_device_one_time_keys;
CREATE POLICY "chat_device_one_time_keys_delete_owner_or_admin"
ON public.chat_device_one_time_keys FOR DELETE
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.chat_devices cd
    WHERE cd.id = chat_device_one_time_keys.device_id
      AND cd.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "chat_media_blobs_read_owner_or_admin" ON public.chat_media_blobs;
CREATE POLICY "chat_media_blobs_read_owner_or_admin"
ON public.chat_media_blobs FOR SELECT
USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_media_blobs_insert_owner_or_admin" ON public.chat_media_blobs;
CREATE POLICY "chat_media_blobs_insert_owner_or_admin"
ON public.chat_media_blobs FOR INSERT
WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_media_blobs_update_owner_or_admin" ON public.chat_media_blobs;
CREATE POLICY "chat_media_blobs_update_owner_or_admin"
ON public.chat_media_blobs FOR UPDATE
USING (auth.uid() = owner_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_media_blobs_delete_owner_or_admin" ON public.chat_media_blobs;
CREATE POLICY "chat_media_blobs_delete_owner_or_admin"
ON public.chat_media_blobs FOR DELETE
USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_message_envelopes_read_related_or_admin" ON public.chat_message_envelopes;
CREATE POLICY "chat_message_envelopes_read_related_or_admin"
ON public.chat_message_envelopes FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "chat_message_envelopes_insert_sender_or_admin" ON public.chat_message_envelopes;
CREATE POLICY "chat_message_envelopes_insert_sender_or_admin"
ON public.chat_message_envelopes FOR INSERT
WITH CHECK (auth.uid() = sender_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_message_envelopes_delete_related_or_admin" ON public.chat_message_envelopes;
CREATE POLICY "chat_message_envelopes_delete_related_or_admin"
ON public.chat_message_envelopes FOR DELETE
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "chat_delivery_receipts_read_related_or_admin" ON public.chat_delivery_receipts;
CREATE POLICY "chat_delivery_receipts_read_related_or_admin"
ON public.chat_delivery_receipts FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "chat_delivery_receipts_insert_recipient_or_admin" ON public.chat_delivery_receipts;
CREATE POLICY "chat_delivery_receipts_insert_recipient_or_admin"
ON public.chat_delivery_receipts FOR INSERT
WITH CHECK (auth.uid() = recipient_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_delivery_receipts_delete_related_or_admin" ON public.chat_delivery_receipts;
CREATE POLICY "chat_delivery_receipts_delete_related_or_admin"
ON public.chat_delivery_receipts FOR DELETE
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "chat_presence_read_authenticated_or_admin" ON public.chat_presence;
CREATE POLICY "chat_presence_read_authenticated_or_admin"
ON public.chat_presence FOR SELECT
USING (auth.uid() IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS "chat_presence_insert_self_or_admin" ON public.chat_presence;
CREATE POLICY "chat_presence_insert_self_or_admin"
ON public.chat_presence FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_presence_update_self_or_admin" ON public.chat_presence;
CREATE POLICY "chat_presence_update_self_or_admin"
ON public.chat_presence FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "chat_presence_delete_self_or_admin" ON public.chat_presence;
CREATE POLICY "chat_presence_delete_self_or_admin"
ON public.chat_presence FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());
