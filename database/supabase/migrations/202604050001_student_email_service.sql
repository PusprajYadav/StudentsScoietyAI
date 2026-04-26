-- Student Society: mailbox subscriptions, requests, connections, batched R2 email storage, and notifications

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
      'post_mention',
      'coin_wallet',
      'chat_request',
      'chat_message',
      'email_mailbox'
    )
  );

ALTER TABLE public.notification_push_preferences
  ADD COLUMN IF NOT EXISTS enable_email_mailbox_push BOOLEAN NOT NULL DEFAULT TRUE;

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
VALUES
  (
    'student_email_month_pass',
    'Student Email 1 Month',
    'Unlock Student Society mailbox access for 30 days.',
    'business',
    'time_pass',
    120,
    'student_email_access',
    30,
    TRUE,
    64
  ),
  (
    'student_email_six_month_pass',
    'Student Email 6 Months',
    'Unlock Student Society mailbox access for 180 days.',
    'business',
    'time_pass',
    599,
    'student_email_access',
    180,
    TRUE,
    65
  ),
  (
    'student_email_year_pass',
    'Student Email 1 Year',
    'Unlock Student Society mailbox access for 365 days.',
    'business',
    'time_pass',
    999,
    'student_email_access',
    365,
    TRUE,
    66
  )
ON CONFLICT (feature_key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_mailbox_request_status') THEN
    CREATE TYPE public.student_mailbox_request_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'assigned',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_mailbox_status') THEN
    CREATE TYPE public.student_mailbox_status AS ENUM (
      'pending_setup',
      'active',
      'suspended',
      'renewal_required',
      'disabled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_mailbox_connection_scope') THEN
    CREATE TYPE public.student_mailbox_connection_scope AS ENUM (
      'assigned',
      'user_owned'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_mailbox_connection_encryption') THEN
    CREATE TYPE public.student_mailbox_connection_encryption AS ENUM (
      'ssl',
      'tls',
      'none'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_mailbox_folder') THEN
    CREATE TYPE public.student_mailbox_folder AS ENUM (
      'inbox',
      'sent',
      'trash'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_mailbox_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_local_part TEXT NOT NULL CHECK (preferred_local_part ~ '^[a-z0-9._-]{3,64}$'),
  requested_domain TEXT NOT NULL DEFAULT 'studentsociety.in',
  preferred_email_address TEXT NOT NULL,
  plan_feature_key TEXT NOT NULL REFERENCES public.coin_feature_settings(feature_key) ON DELETE RESTRICT,
  status public.student_mailbox_request_status NOT NULL DEFAULT 'pending',
  request_note TEXT,
  admin_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_mailbox_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_student_mailbox_requests_user_id
  ON public.student_mailbox_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_mailbox_requests_status
  ON public.student_mailbox_requests(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_mailbox_requests_pending_user
  ON public.student_mailbox_requests(user_id)
  WHERE status IN ('pending', 'approved');

DROP TRIGGER IF EXISTS student_mailbox_requests_set_updated_at ON public.student_mailbox_requests;
CREATE TRIGGER student_mailbox_requests_set_updated_at
BEFORE UPDATE ON public.student_mailbox_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.student_mailbox_requests(id) ON DELETE SET NULL,
  domain TEXT NOT NULL DEFAULT 'studentsociety.in',
  local_part TEXT NOT NULL CHECK (local_part ~ '^[a-z0-9._-]{3,64}$'),
  email_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  status public.student_mailbox_status NOT NULL DEFAULT 'pending_setup',
  quota_bytes BIGINT NOT NULL DEFAULT 524288000 CHECK (quota_bytes > 0),
  used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_student_mailboxes_status
  ON public.student_mailboxes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_mailboxes_email_address
  ON public.student_mailboxes(email_address);

DROP TRIGGER IF EXISTS student_mailboxes_set_updated_at ON public.student_mailboxes;
CREATE TRIGGER student_mailboxes_set_updated_at
BEFORE UPDATE ON public.student_mailboxes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_mailbox_requests
  DROP CONSTRAINT IF EXISTS student_mailbox_requests_approved_mailbox_id_fkey;

ALTER TABLE public.student_mailbox_requests
  ADD CONSTRAINT student_mailbox_requests_approved_mailbox_id_fkey
  FOREIGN KEY (approved_mailbox_id)
  REFERENCES public.student_mailboxes(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.student_mailbox_connection_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID NOT NULL REFERENCES public.student_mailboxes(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope public.student_mailbox_connection_scope NOT NULL DEFAULT 'assigned',
  name TEXT NOT NULL,
  email_address TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  password_iv TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587 CHECK (smtp_port > 0),
  smtp_encryption public.student_mailbox_connection_encryption NOT NULL DEFAULT 'tls',
  imap_host TEXT,
  imap_port INTEGER CHECK (imap_port IS NULL OR imap_port > 0),
  imap_encryption public.student_mailbox_connection_encryption,
  outbound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  inbound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_uid BIGINT,
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (
    (imap_host IS NULL AND imap_port IS NULL AND imap_encryption IS NULL)
    OR (imap_host IS NOT NULL AND imap_port IS NOT NULL AND imap_encryption IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_student_mailbox_connection_profiles_mailbox_id
  ON public.student_mailbox_connection_profiles(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_student_mailbox_connection_profiles_owner_user_id
  ON public.student_mailbox_connection_profiles(owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_mailbox_connection_profiles_default
  ON public.student_mailbox_connection_profiles(mailbox_id)
  WHERE is_default = TRUE;

DROP TRIGGER IF EXISTS student_mailbox_connection_profiles_set_updated_at ON public.student_mailbox_connection_profiles;
CREATE TRIGGER student_mailbox_connection_profiles_set_updated_at
BEFORE UPDATE ON public.student_mailbox_connection_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_mailbox_message_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id UUID NOT NULL REFERENCES public.student_mailboxes(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder public.student_mailbox_folder NOT NULL DEFAULT 'inbox',
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  thread_id TEXT,
  external_message_id TEXT,
  in_reply_to_message_id TEXT,
  forwarded_from_message_id TEXT,
  subject TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  from_name TEXT,
  to_recipients JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(to_recipients) = 'array'),
  cc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(cc_recipients) = 'array'),
  bcc_recipients JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(bcc_recipients) = 'array'),
  snippet TEXT,
  has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_count INTEGER NOT NULL DEFAULT 0 CHECK (attachment_count >= 0),
  stored_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (stored_size_bytes >= 0),
  tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tracked_recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (tracked_recipient_count >= 0),
  opened_recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (opened_recipient_count >= 0),
  total_open_count INTEGER NOT NULL DEFAULT 0 CHECK (total_open_count >= 0),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  batch_number INTEGER NOT NULL CHECK (batch_number > 0),
  batch_position INTEGER NOT NULL CHECK (batch_position >= 0 AND batch_position < 10),
  r2_batch_key TEXT NOT NULL,
  message_payload_version INTEGER NOT NULL DEFAULT 1 CHECK (message_payload_version > 0),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_student_mailbox_message_index_mailbox_folder_created_at
  ON public.student_mailbox_message_index(mailbox_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_mailbox_message_index_owner_folder_created_at
  ON public.student_mailbox_message_index(owner_user_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_mailbox_message_index_external_message_id
  ON public.student_mailbox_message_index(mailbox_id, external_message_id)
  WHERE external_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_mailbox_message_index_batch_position
  ON public.student_mailbox_message_index(mailbox_id, folder, batch_number, batch_position);

DROP TRIGGER IF EXISTS student_mailbox_message_index_set_updated_at ON public.student_mailbox_message_index;
CREATE TRIGGER student_mailbox_message_index_set_updated_at
BEFORE UPDATE ON public.student_mailbox_message_index
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.student_mailbox_delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_index_id UUID NOT NULL REFERENCES public.student_mailbox_message_index(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  tracking_token TEXT NOT NULL UNIQUE,
  smtp_message_id TEXT,
  open_count INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_student_mailbox_delivery_receipts_message_index_id
  ON public.student_mailbox_delivery_receipts(message_index_id);
CREATE INDEX IF NOT EXISTS idx_student_mailbox_delivery_receipts_owner_user_id
  ON public.student_mailbox_delivery_receipts(owner_user_id, created_at DESC);

DROP TRIGGER IF EXISTS student_mailbox_delivery_receipts_set_updated_at ON public.student_mailbox_delivery_receipts;
CREATE TRIGGER student_mailbox_delivery_receipts_set_updated_at
BEFORE UPDATE ON public.student_mailbox_delivery_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_mailbox_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mailbox_connection_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mailbox_message_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mailbox_delivery_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_mailbox_requests_read_self_or_admin" ON public.student_mailbox_requests;
CREATE POLICY "student_mailbox_requests_read_self_or_admin"
ON public.student_mailbox_requests FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_requests_insert_self_or_admin" ON public.student_mailbox_requests;
CREATE POLICY "student_mailbox_requests_insert_self_or_admin"
ON public.student_mailbox_requests FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_requests_update_admin_only" ON public.student_mailbox_requests;
CREATE POLICY "student_mailbox_requests_update_admin_only"
ON public.student_mailbox_requests FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_requests_delete_admin_only" ON public.student_mailbox_requests;
CREATE POLICY "student_mailbox_requests_delete_admin_only"
ON public.student_mailbox_requests FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "student_mailboxes_read_owner_or_admin" ON public.student_mailboxes;
CREATE POLICY "student_mailboxes_read_owner_or_admin"
ON public.student_mailboxes FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailboxes_insert_admin_only" ON public.student_mailboxes;
CREATE POLICY "student_mailboxes_insert_admin_only"
ON public.student_mailboxes FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "student_mailboxes_update_owner_or_admin" ON public.student_mailboxes;
CREATE POLICY "student_mailboxes_update_owner_or_admin"
ON public.student_mailboxes FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailboxes_delete_admin_only" ON public.student_mailboxes;
CREATE POLICY "student_mailboxes_delete_admin_only"
ON public.student_mailboxes FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_connection_profiles_read_owner_or_admin" ON public.student_mailbox_connection_profiles;
CREATE POLICY "student_mailbox_connection_profiles_read_owner_or_admin"
ON public.student_mailbox_connection_profiles FOR SELECT
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_connection_profiles_insert_owner_or_admin" ON public.student_mailbox_connection_profiles;
CREATE POLICY "student_mailbox_connection_profiles_insert_owner_or_admin"
ON public.student_mailbox_connection_profiles FOR INSERT
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_connection_profiles_update_owner_or_admin" ON public.student_mailbox_connection_profiles;
CREATE POLICY "student_mailbox_connection_profiles_update_owner_or_admin"
ON public.student_mailbox_connection_profiles FOR UPDATE
USING (auth.uid() = owner_user_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_connection_profiles_delete_owner_or_admin" ON public.student_mailbox_connection_profiles;
CREATE POLICY "student_mailbox_connection_profiles_delete_owner_or_admin"
ON public.student_mailbox_connection_profiles FOR DELETE
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_message_index_read_owner_or_admin" ON public.student_mailbox_message_index;
CREATE POLICY "student_mailbox_message_index_read_owner_or_admin"
ON public.student_mailbox_message_index FOR SELECT
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_message_index_insert_owner_or_admin" ON public.student_mailbox_message_index;
CREATE POLICY "student_mailbox_message_index_insert_owner_or_admin"
ON public.student_mailbox_message_index FOR INSERT
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_message_index_update_owner_or_admin" ON public.student_mailbox_message_index;
CREATE POLICY "student_mailbox_message_index_update_owner_or_admin"
ON public.student_mailbox_message_index FOR UPDATE
USING (auth.uid() = owner_user_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_message_index_delete_owner_or_admin" ON public.student_mailbox_message_index;
CREATE POLICY "student_mailbox_message_index_delete_owner_or_admin"
ON public.student_mailbox_message_index FOR DELETE
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_delivery_receipts_read_owner_or_admin" ON public.student_mailbox_delivery_receipts;
CREATE POLICY "student_mailbox_delivery_receipts_read_owner_or_admin"
ON public.student_mailbox_delivery_receipts FOR SELECT
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_delivery_receipts_insert_owner_or_admin" ON public.student_mailbox_delivery_receipts;
CREATE POLICY "student_mailbox_delivery_receipts_insert_owner_or_admin"
ON public.student_mailbox_delivery_receipts FOR INSERT
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_delivery_receipts_update_owner_or_admin" ON public.student_mailbox_delivery_receipts;
CREATE POLICY "student_mailbox_delivery_receipts_update_owner_or_admin"
ON public.student_mailbox_delivery_receipts FOR UPDATE
USING (auth.uid() = owner_user_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "student_mailbox_delivery_receipts_delete_owner_or_admin" ON public.student_mailbox_delivery_receipts;
CREATE POLICY "student_mailbox_delivery_receipts_delete_owner_or_admin"
ON public.student_mailbox_delivery_receipts FOR DELETE
USING (auth.uid() = owner_user_id OR public.is_admin());
