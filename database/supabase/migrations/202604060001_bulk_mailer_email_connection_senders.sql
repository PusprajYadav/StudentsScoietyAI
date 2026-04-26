DO $$
BEGIN
  ALTER TYPE public.bulk_mailer_smtp_scope ADD VALUE IF NOT EXISTS 'email_connection';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.bulk_mailer_campaigns
  ADD COLUMN IF NOT EXISTS selected_email_connection_id UUID REFERENCES public.student_mailbox_connection_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_email_connection_id UUID REFERENCES public.student_mailbox_connection_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaigns_selected_email_connection_id
  ON public.bulk_mailer_campaigns(selected_email_connection_id);

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_campaigns_resolved_email_connection_id
  ON public.bulk_mailer_campaigns(resolved_email_connection_id);

ALTER TABLE public.bulk_mailer_send_logs
  ADD COLUMN IF NOT EXISTS email_connection_id UUID REFERENCES public.student_mailbox_connection_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bulk_mailer_send_logs_email_connection_id
  ON public.bulk_mailer_send_logs(email_connection_id);
