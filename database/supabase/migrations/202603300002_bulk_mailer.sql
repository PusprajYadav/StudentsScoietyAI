-- Student Society: Bulk Mailer with user SMTP, admin fallback SMTP, templates, campaigns, recipients, logs, and limits

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulk_mailer_smtp_scope') THEN
    CREATE TYPE public.bulk_mailer_smtp_scope AS ENUM ('admin_default', 'user_owned');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulk_mailer_smtp_encryption') THEN
    CREATE TYPE public.bulk_mailer_smtp_encryption AS ENUM ('tls', 'ssl', 'none');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulk_mailer_campaign_status') THEN
    CREATE TYPE public.bulk_mailer_campaign_status AS ENUM ('draft', 'queued', 'sending', 'paused', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulk_mailer_recipient_status') THEN
    CREATE TYPE public.bulk_mailer_recipient_status AS ENUM ('queued', 'sending', 'sent', 'opened', 'failed', 'skipped');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulk_mailer_log_status') THEN
    CREATE TYPE public.bulk_mailer_log_status AS ENUM ('queued', 'sent', 'opened', 'failed', 'skipped');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bulk_mailer_recipient_source') THEN
    CREATE TYPE public.bulk_mailer_recipient_source AS ENUM ('manual', 'csv');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bulk_mailer_platform_settings (
  id BIGINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_hourly_send_limit INTEGER NOT NULL DEFAULT 200 CHECK (default_hourly_send_limit > 0),
  default_daily_send_limit INTEGER NOT NULL DEFAULT 1000 CHECK (default_daily_send_limit > 0),
  default_campaign_recipient_limit INTEGER NOT NULL DEFAULT 500 CHECK (default_campaign_recipient_limit > 0),
  default_max_smtp_profiles_per_user INTEGER NOT NULL DEFAULT 2 CHECK (default_max_smtp_profiles_per_user > 0),
  default_max_templates_per_user INTEGER NOT NULL DEFAULT 30 CHECK (default_max_templates_per_user > 0),
  default_max_campaigns_per_day INTEGER NOT NULL DEFAULT 10 CHECK (default_max_campaigns_per_day > 0),
  allow_user_smtp_profiles BOOLEAN NOT NULL DEFAULT TRUE,
  open_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.bulk_mailer_platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS bulk_mailer_platform_settings_set_updated_at ON public.bulk_mailer_platform_settings;
CREATE TRIGGER bulk_mailer_platform_settings_set_updated_at
BEFORE UPDATE ON public.bulk_mailer_platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_mailer_user_limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  hourly_send_limit INTEGER CHECK (hourly_send_limit IS NULL OR hourly_send_limit > 0),
  daily_send_limit INTEGER CHECK (daily_send_limit IS NULL OR daily_send_limit > 0),
  campaign_recipient_limit INTEGER CHECK (campaign_recipient_limit IS NULL OR campaign_recipient_limit > 0),
  max_smtp_profiles INTEGER CHECK (max_smtp_profiles IS NULL OR max_smtp_profiles > 0),
  max_templates INTEGER CHECK (max_templates IS NULL OR max_templates > 0),
  max_campaigns_per_day INTEGER CHECK (max_campaigns_per_day IS NULL OR max_campaigns_per_day > 0),
  sending_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  override_note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_user_limit_overrides_user_id
  ON public.bulk_mailer_user_limit_overrides(user_id);

DROP TRIGGER IF EXISTS bulk_mailer_user_limit_overrides_set_updated_at ON public.bulk_mailer_user_limit_overrides;
CREATE TRIGGER bulk_mailer_user_limit_overrides_set_updated_at
BEFORE UPDATE ON public.bulk_mailer_user_limit_overrides
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_mailer_smtp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope public.bulk_mailer_smtp_scope NOT NULL DEFAULT 'user_owned',
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587 CHECK (port BETWEEN 1 AND 65535),
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  password_iv TEXT NOT NULL,
  encryption public.bulk_mailer_smtp_encryption NOT NULL DEFAULT 'tls',
  auth_method TEXT NOT NULL DEFAULT 'login' CHECK (auth_method IN ('login', 'plain')),
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 20 CHECK (rate_limit_per_minute > 0),
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 200 CHECK (rate_limit_per_hour > 0),
  daily_limit INTEGER NOT NULL DEFAULT 1000 CHECK (daily_limit > 0),
  monthly_limit INTEGER NOT NULL DEFAULT 25000 CHECK (monthly_limit > 0),
  total_sent_count BIGINT NOT NULL DEFAULT 0 CHECK (total_sent_count >= 0),
  total_failed_count BIGINT NOT NULL DEFAULT 0 CHECK (total_failed_count >= 0),
  last_used_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT NOT NULL DEFAULT 'untested' CHECK (last_test_status IN ('untested', 'success', 'failed')),
  last_test_error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (
    (scope = 'admin_default' AND owner_user_id IS NULL)
    OR (scope = 'user_owned' AND owner_user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_smtp_profiles_owner_user_id
  ON public.bulk_mailer_smtp_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_smtp_profiles_scope
  ON public.bulk_mailer_smtp_profiles(scope);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_smtp_profiles_is_active
  ON public.bulk_mailer_smtp_profiles(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bulk_mailer_smtp_profiles_default_fallback
  ON public.bulk_mailer_smtp_profiles(scope)
  WHERE is_default_fallback = TRUE AND scope = 'admin_default';

DROP TRIGGER IF EXISTS bulk_mailer_smtp_profiles_set_updated_at ON public.bulk_mailer_smtp_profiles;
CREATE TRIGGER bulk_mailer_smtp_profiles_set_updated_at
BEFORE UPDATE ON public.bulk_mailer_smtp_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_mailer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  available_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (owner_user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_templates_owner_user_id
  ON public.bulk_mailer_templates(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_templates_is_shared
  ON public.bulk_mailer_templates(is_shared);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_templates_is_active
  ON public.bulk_mailer_templates(is_active);

DROP TRIGGER IF EXISTS bulk_mailer_templates_set_updated_at ON public.bulk_mailer_templates;
CREATE TRIGGER bulk_mailer_templates_set_updated_at
BEFORE UPDATE ON public.bulk_mailer_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_mailer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status public.bulk_mailer_campaign_status NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.bulk_mailer_templates(id) ON DELETE SET NULL,
  selected_smtp_profile_id UUID REFERENCES public.bulk_mailer_smtp_profiles(id) ON DELETE SET NULL,
  resolved_smtp_profile_id UUID REFERENCES public.bulk_mailer_smtp_profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  from_name_override TEXT,
  reply_to_email TEXT,
  recipient_source public.bulk_mailer_recipient_source NOT NULL DEFAULT 'manual',
  variable_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  campaign_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  opened_recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (opened_recipient_count >= 0),
  total_open_count INTEGER NOT NULL DEFAULT 0 CHECK (total_open_count >= 0),
  last_batch_processed_count INTEGER NOT NULL DEFAULT 0 CHECK (last_batch_processed_count >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaigns_owner_user_id
  ON public.bulk_mailer_campaigns(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaigns_status
  ON public.bulk_mailer_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaigns_created_at
  ON public.bulk_mailer_campaigns(created_at DESC);

DROP TRIGGER IF EXISTS bulk_mailer_campaigns_set_updated_at ON public.bulk_mailer_campaigns;
CREATE TRIGGER bulk_mailer_campaigns_set_updated_at
BEFORE UPDATE ON public.bulk_mailer_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_mailer_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bulk_mailer_campaigns(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  variable_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_index INTEGER,
  source_label TEXT,
  status public.bulk_mailer_recipient_status NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaign_recipients_campaign_id
  ON public.bulk_mailer_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaign_recipients_owner_user_id
  ON public.bulk_mailer_campaign_recipients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaign_recipients_status
  ON public.bulk_mailer_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaign_recipients_recipient_email
  ON public.bulk_mailer_campaign_recipients(recipient_email);

DROP TRIGGER IF EXISTS bulk_mailer_campaign_recipients_set_updated_at ON public.bulk_mailer_campaign_recipients;
CREATE TRIGGER bulk_mailer_campaign_recipients_set_updated_at
BEFORE UPDATE ON public.bulk_mailer_campaign_recipients
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_mailer_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.bulk_mailer_campaigns(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.bulk_mailer_campaign_recipients(id) ON DELETE SET NULL,
  sender_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  smtp_profile_id UUID REFERENCES public.bulk_mailer_smtp_profiles(id) ON DELETE SET NULL,
  smtp_scope public.bulk_mailer_smtp_scope,
  template_id UUID REFERENCES public.bulk_mailer_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  rendered_html TEXT,
  rendered_text TEXT,
  variable_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.bulk_mailer_log_status NOT NULL DEFAULT 'queued',
  smtp_message_id TEXT,
  smtp_response TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_campaign_id
  ON public.bulk_mailer_send_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_sender_user_id
  ON public.bulk_mailer_send_logs(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_smtp_profile_id
  ON public.bulk_mailer_send_logs(smtp_profile_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_status
  ON public.bulk_mailer_send_logs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_sent_at
  ON public.bulk_mailer_send_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_recipient_email
  ON public.bulk_mailer_send_logs(recipient_email);

CREATE OR REPLACE FUNCTION public.bulk_mailer_sync_campaign_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_campaign_id UUID;
BEGIN
  target_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

  UPDATE public.bulk_mailer_campaigns AS campaigns
  SET
    total_recipients = COALESCE((
      SELECT COUNT(*)
      FROM public.bulk_mailer_campaign_recipients AS recipients
      WHERE recipients.campaign_id = target_campaign_id
    ), 0),
    sent_count = COALESCE((
      SELECT COUNT(*)
      FROM public.bulk_mailer_campaign_recipients AS recipients
      WHERE recipients.campaign_id = target_campaign_id
        AND recipients.status IN ('sent', 'opened')
    ), 0),
    failed_count = COALESCE((
      SELECT COUNT(*)
      FROM public.bulk_mailer_campaign_recipients AS recipients
      WHERE recipients.campaign_id = target_campaign_id
        AND recipients.status = 'failed'
    ), 0),
    opened_recipient_count = COALESCE((
      SELECT COUNT(*)
      FROM public.bulk_mailer_campaign_recipients AS recipients
      WHERE recipients.campaign_id = target_campaign_id
        AND recipients.open_count > 0
    ), 0),
    total_open_count = COALESCE((
      SELECT SUM(recipients.open_count)
      FROM public.bulk_mailer_campaign_recipients AS recipients
      WHERE recipients.campaign_id = target_campaign_id
    ), 0),
    updated_at = timezone('utc', now())
  WHERE campaigns.id = target_campaign_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS bulk_mailer_sync_campaign_totals_after_change ON public.bulk_mailer_campaign_recipients;
CREATE TRIGGER bulk_mailer_sync_campaign_totals_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.bulk_mailer_campaign_recipients
FOR EACH ROW
EXECUTE FUNCTION public.bulk_mailer_sync_campaign_totals();

ALTER TABLE public.bulk_mailer_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mailer_user_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mailer_smtp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mailer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mailer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mailer_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mailer_send_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulk_mailer_platform_settings_read_authenticated" ON public.bulk_mailer_platform_settings;
CREATE POLICY "bulk_mailer_platform_settings_read_authenticated"
ON public.bulk_mailer_platform_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "bulk_mailer_platform_settings_insert_admin" ON public.bulk_mailer_platform_settings;
CREATE POLICY "bulk_mailer_platform_settings_insert_admin"
ON public.bulk_mailer_platform_settings FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_platform_settings_update_admin" ON public.bulk_mailer_platform_settings;
CREATE POLICY "bulk_mailer_platform_settings_update_admin"
ON public.bulk_mailer_platform_settings FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_user_limit_overrides_read_self_or_admin" ON public.bulk_mailer_user_limit_overrides;
CREATE POLICY "bulk_mailer_user_limit_overrides_read_self_or_admin"
ON public.bulk_mailer_user_limit_overrides FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_user_limit_overrides_insert_admin" ON public.bulk_mailer_user_limit_overrides;
CREATE POLICY "bulk_mailer_user_limit_overrides_insert_admin"
ON public.bulk_mailer_user_limit_overrides FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_user_limit_overrides_update_admin" ON public.bulk_mailer_user_limit_overrides;
CREATE POLICY "bulk_mailer_user_limit_overrides_update_admin"
ON public.bulk_mailer_user_limit_overrides FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_user_limit_overrides_delete_admin" ON public.bulk_mailer_user_limit_overrides;
CREATE POLICY "bulk_mailer_user_limit_overrides_delete_admin"
ON public.bulk_mailer_user_limit_overrides FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_smtp_profiles_read_owner_or_admin" ON public.bulk_mailer_smtp_profiles;
CREATE POLICY "bulk_mailer_smtp_profiles_read_owner_or_admin"
ON public.bulk_mailer_smtp_profiles FOR SELECT
USING (
  (scope = 'user_owned' AND auth.uid() = owner_user_id)
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bulk_mailer_smtp_profiles_insert_owner_or_admin" ON public.bulk_mailer_smtp_profiles;
CREATE POLICY "bulk_mailer_smtp_profiles_insert_owner_or_admin"
ON public.bulk_mailer_smtp_profiles FOR INSERT
WITH CHECK (
  (scope = 'user_owned' AND auth.uid() = owner_user_id AND auth.uid() = created_by)
  OR (scope = 'admin_default' AND public.is_admin())
);

DROP POLICY IF EXISTS "bulk_mailer_smtp_profiles_update_owner_or_admin" ON public.bulk_mailer_smtp_profiles;
CREATE POLICY "bulk_mailer_smtp_profiles_update_owner_or_admin"
ON public.bulk_mailer_smtp_profiles FOR UPDATE
USING (
  (scope = 'user_owned' AND auth.uid() = owner_user_id)
  OR public.is_admin()
)
WITH CHECK (
  (scope = 'user_owned' AND auth.uid() = owner_user_id)
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bulk_mailer_smtp_profiles_delete_owner_or_admin" ON public.bulk_mailer_smtp_profiles;
CREATE POLICY "bulk_mailer_smtp_profiles_delete_owner_or_admin"
ON public.bulk_mailer_smtp_profiles FOR DELETE
USING (
  (scope = 'user_owned' AND auth.uid() = owner_user_id)
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bulk_mailer_templates_read_owner_shared_or_admin" ON public.bulk_mailer_templates;
CREATE POLICY "bulk_mailer_templates_read_owner_shared_or_admin"
ON public.bulk_mailer_templates FOR SELECT
USING (is_shared = TRUE OR auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_templates_insert_owner_or_admin" ON public.bulk_mailer_templates;
CREATE POLICY "bulk_mailer_templates_insert_owner_or_admin"
ON public.bulk_mailer_templates FOR INSERT
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_templates_update_owner_or_admin" ON public.bulk_mailer_templates;
CREATE POLICY "bulk_mailer_templates_update_owner_or_admin"
ON public.bulk_mailer_templates FOR UPDATE
USING (auth.uid() = owner_user_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_templates_delete_owner_or_admin" ON public.bulk_mailer_templates;
CREATE POLICY "bulk_mailer_templates_delete_owner_or_admin"
ON public.bulk_mailer_templates FOR DELETE
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaigns_read_owner_or_admin" ON public.bulk_mailer_campaigns;
CREATE POLICY "bulk_mailer_campaigns_read_owner_or_admin"
ON public.bulk_mailer_campaigns FOR SELECT
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaigns_insert_owner_or_admin" ON public.bulk_mailer_campaigns;
CREATE POLICY "bulk_mailer_campaigns_insert_owner_or_admin"
ON public.bulk_mailer_campaigns FOR INSERT
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaigns_update_owner_or_admin" ON public.bulk_mailer_campaigns;
CREATE POLICY "bulk_mailer_campaigns_update_owner_or_admin"
ON public.bulk_mailer_campaigns FOR UPDATE
USING (auth.uid() = owner_user_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaigns_delete_owner_or_admin" ON public.bulk_mailer_campaigns;
CREATE POLICY "bulk_mailer_campaigns_delete_owner_or_admin"
ON public.bulk_mailer_campaigns FOR DELETE
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaign_recipients_read_owner_or_admin" ON public.bulk_mailer_campaign_recipients;
CREATE POLICY "bulk_mailer_campaign_recipients_read_owner_or_admin"
ON public.bulk_mailer_campaign_recipients FOR SELECT
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaign_recipients_insert_owner_or_admin" ON public.bulk_mailer_campaign_recipients;
CREATE POLICY "bulk_mailer_campaign_recipients_insert_owner_or_admin"
ON public.bulk_mailer_campaign_recipients FOR INSERT
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaign_recipients_update_owner_or_admin" ON public.bulk_mailer_campaign_recipients;
CREATE POLICY "bulk_mailer_campaign_recipients_update_owner_or_admin"
ON public.bulk_mailer_campaign_recipients FOR UPDATE
USING (auth.uid() = owner_user_id OR public.is_admin())
WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_campaign_recipients_delete_owner_or_admin" ON public.bulk_mailer_campaign_recipients;
CREATE POLICY "bulk_mailer_campaign_recipients_delete_owner_or_admin"
ON public.bulk_mailer_campaign_recipients FOR DELETE
USING (auth.uid() = owner_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_send_logs_read_owner_or_admin" ON public.bulk_mailer_send_logs;
CREATE POLICY "bulk_mailer_send_logs_read_owner_or_admin"
ON public.bulk_mailer_send_logs FOR SELECT
USING (auth.uid() = sender_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_send_logs_insert_owner_or_admin" ON public.bulk_mailer_send_logs;
CREATE POLICY "bulk_mailer_send_logs_insert_owner_or_admin"
ON public.bulk_mailer_send_logs FOR INSERT
WITH CHECK (auth.uid() = sender_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_send_logs_update_owner_or_admin" ON public.bulk_mailer_send_logs;
CREATE POLICY "bulk_mailer_send_logs_update_owner_or_admin"
ON public.bulk_mailer_send_logs FOR UPDATE
USING (auth.uid() = sender_user_id OR public.is_admin())
WITH CHECK (auth.uid() = sender_user_id OR public.is_admin());

DROP POLICY IF EXISTS "bulk_mailer_send_logs_delete_owner_or_admin" ON public.bulk_mailer_send_logs;
CREATE POLICY "bulk_mailer_send_logs_delete_owner_or_admin"
ON public.bulk_mailer_send_logs FOR DELETE
USING (auth.uid() = sender_user_id OR public.is_admin());
