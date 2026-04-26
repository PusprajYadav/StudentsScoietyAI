-- Student Society: Instagram Automation (Meta OAuth, comment replies, DMs, combo flows, logs)

CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'facebook_login' CHECK (connection_type IN ('facebook_login', 'instagram_login')),
  account_name TEXT,
  instagram_username TEXT,
  ig_user_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT,
  access_token_encrypted TEXT NOT NULL,
  access_token_iv TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  granted_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  automation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_media_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_accounts_ig_user_id
  ON public.instagram_accounts(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_page_id
  ON public.instagram_accounts(page_id);

DROP TRIGGER IF EXISTS instagram_accounts_set_updated_at ON public.instagram_accounts;
CREATE TRIGGER instagram_accounts_set_updated_at
BEFORE UPDATE ON public.instagram_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_comment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  media_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  keyword_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_text TEXT NOT NULL,
  reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  delay_min_seconds INTEGER NOT NULL DEFAULT 2 CHECK (delay_min_seconds BETWEEN 0 AND 60),
  delay_max_seconds INTEGER NOT NULL DEFAULT 5 CHECK (delay_max_seconds BETWEEN 0 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (delay_max_seconds >= delay_min_seconds)
);

CREATE INDEX IF NOT EXISTS idx_instagram_comment_rules_user_id
  ON public.instagram_comment_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comment_rules_media_id
  ON public.instagram_comment_rules(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comment_rules_is_active
  ON public.instagram_comment_rules(is_active);

DROP TRIGGER IF EXISTS instagram_comment_rules_set_updated_at ON public.instagram_comment_rules;
CREATE TRIGGER instagram_comment_rules_set_updated_at
BEFORE UPDATE ON public.instagram_comment_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_dm_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  keyword TEXT NOT NULL,
  keyword_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_text TEXT NOT NULL,
  reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  delay_min_seconds INTEGER NOT NULL DEFAULT 2 CHECK (delay_min_seconds BETWEEN 0 AND 60),
  delay_max_seconds INTEGER NOT NULL DEFAULT 5 CHECK (delay_max_seconds BETWEEN 0 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (delay_max_seconds >= delay_min_seconds)
);

CREATE INDEX IF NOT EXISTS idx_instagram_dm_rules_user_id
  ON public.instagram_dm_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_dm_rules_is_active
  ON public.instagram_dm_rules(is_active);

DROP TRIGGER IF EXISTS instagram_dm_rules_set_updated_at ON public.instagram_dm_rules;
CREATE TRIGGER instagram_dm_rules_set_updated_at
BEFORE UPDATE ON public.instagram_dm_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_comment_dm_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  media_id TEXT,
  trigger_keyword TEXT NOT NULL,
  trigger_keyword_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment_reply_text TEXT NOT NULL,
  comment_reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  dm_reply_text TEXT NOT NULL,
  dm_reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  delay_min_seconds INTEGER NOT NULL DEFAULT 2 CHECK (delay_min_seconds BETWEEN 0 AND 60),
  delay_max_seconds INTEGER NOT NULL DEFAULT 5 CHECK (delay_max_seconds BETWEEN 0 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (delay_max_seconds >= delay_min_seconds)
);

CREATE INDEX IF NOT EXISTS idx_instagram_comment_dm_rules_user_id
  ON public.instagram_comment_dm_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comment_dm_rules_media_id
  ON public.instagram_comment_dm_rules(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comment_dm_rules_is_active
  ON public.instagram_comment_dm_rules(is_active);

DROP TRIGGER IF EXISTS instagram_comment_dm_rules_set_updated_at ON public.instagram_comment_dm_rules;
CREATE TRIGGER instagram_comment_dm_rules_set_updated_at
BEFORE UPDATE ON public.instagram_comment_dm_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'success',
  message TEXT NOT NULL,
  related_media_id TEXT,
  related_comment_id TEXT,
  related_customer_id TEXT,
  matched_keyword TEXT,
  event_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_user_id
  ON public.instagram_automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_created_at
  ON public.instagram_automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_action_type
  ON public.instagram_automation_logs(action_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_automation_logs_event_key
  ON public.instagram_automation_logs(event_key)
  WHERE event_key IS NOT NULL;

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_dm_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comment_dm_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instagram_accounts_read_owner_or_admin" ON public.instagram_accounts;
CREATE POLICY "instagram_accounts_read_owner_or_admin"
ON public.instagram_accounts FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_accounts_insert_owner_or_admin" ON public.instagram_accounts;
CREATE POLICY "instagram_accounts_insert_owner_or_admin"
ON public.instagram_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_accounts_update_owner_or_admin" ON public.instagram_accounts;
CREATE POLICY "instagram_accounts_update_owner_or_admin"
ON public.instagram_accounts FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_accounts_delete_owner_or_admin" ON public.instagram_accounts;
CREATE POLICY "instagram_accounts_delete_owner_or_admin"
ON public.instagram_accounts FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_rules_read_owner_or_admin" ON public.instagram_comment_rules;
CREATE POLICY "instagram_comment_rules_read_owner_or_admin"
ON public.instagram_comment_rules FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_rules_insert_owner_or_admin" ON public.instagram_comment_rules;
CREATE POLICY "instagram_comment_rules_insert_owner_or_admin"
ON public.instagram_comment_rules FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_rules_update_owner_or_admin" ON public.instagram_comment_rules;
CREATE POLICY "instagram_comment_rules_update_owner_or_admin"
ON public.instagram_comment_rules FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_rules_delete_owner_or_admin" ON public.instagram_comment_rules;
CREATE POLICY "instagram_comment_rules_delete_owner_or_admin"
ON public.instagram_comment_rules FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_dm_rules_read_owner_or_admin" ON public.instagram_dm_rules;
CREATE POLICY "instagram_dm_rules_read_owner_or_admin"
ON public.instagram_dm_rules FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_dm_rules_insert_owner_or_admin" ON public.instagram_dm_rules;
CREATE POLICY "instagram_dm_rules_insert_owner_or_admin"
ON public.instagram_dm_rules FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_dm_rules_update_owner_or_admin" ON public.instagram_dm_rules;
CREATE POLICY "instagram_dm_rules_update_owner_or_admin"
ON public.instagram_dm_rules FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_dm_rules_delete_owner_or_admin" ON public.instagram_dm_rules;
CREATE POLICY "instagram_dm_rules_delete_owner_or_admin"
ON public.instagram_dm_rules FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_dm_rules_read_owner_or_admin" ON public.instagram_comment_dm_rules;
CREATE POLICY "instagram_comment_dm_rules_read_owner_or_admin"
ON public.instagram_comment_dm_rules FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_dm_rules_insert_owner_or_admin" ON public.instagram_comment_dm_rules;
CREATE POLICY "instagram_comment_dm_rules_insert_owner_or_admin"
ON public.instagram_comment_dm_rules FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_dm_rules_update_owner_or_admin" ON public.instagram_comment_dm_rules;
CREATE POLICY "instagram_comment_dm_rules_update_owner_or_admin"
ON public.instagram_comment_dm_rules FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comment_dm_rules_delete_owner_or_admin" ON public.instagram_comment_dm_rules;
CREATE POLICY "instagram_comment_dm_rules_delete_owner_or_admin"
ON public.instagram_comment_dm_rules FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_logs_read_owner_or_admin" ON public.instagram_automation_logs;
CREATE POLICY "instagram_automation_logs_read_owner_or_admin"
ON public.instagram_automation_logs FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_logs_insert_owner_or_admin" ON public.instagram_automation_logs;
CREATE POLICY "instagram_automation_logs_insert_owner_or_admin"
ON public.instagram_automation_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_logs_update_owner_or_admin" ON public.instagram_automation_logs;
CREATE POLICY "instagram_automation_logs_update_owner_or_admin"
ON public.instagram_automation_logs FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_logs_delete_owner_or_admin" ON public.instagram_automation_logs;
CREATE POLICY "instagram_automation_logs_delete_owner_or_admin"
ON public.instagram_automation_logs FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());
