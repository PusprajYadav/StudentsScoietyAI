-- Student Society: reported post workflow for user reporting and admin review

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_report_reason') THEN
    CREATE TYPE public.post_report_reason AS ENUM (
      'spam',
      'harassment',
      'hate',
      'nudity',
      'violence',
      'misinformation',
      'scam',
      'copyright',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_report_status') THEN
    CREATE TYPE public.post_report_status AS ENUM (
      'open',
      'actioned',
      'dismissed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reason public.post_report_reason NOT NULL,
  details TEXT,
  status public.post_report_status NOT NULL DEFAULT 'open',
  admin_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (reporter_user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id_created_at
  ON public.post_reports(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_reports_status_created_at
  ON public.post_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_user_id
  ON public.post_reports(reporter_user_id);

DROP TRIGGER IF EXISTS post_reports_set_updated_at ON public.post_reports;
CREATE TRIGGER post_reports_set_updated_at
BEFORE UPDATE ON public.post_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_reports_read_self_or_admin" ON public.post_reports;
CREATE POLICY "post_reports_read_self_or_admin"
ON public.post_reports FOR SELECT
USING (auth.uid() = reporter_user_id OR public.is_admin());

DROP POLICY IF EXISTS "post_reports_insert_self" ON public.post_reports;
CREATE POLICY "post_reports_insert_self"
ON public.post_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "post_reports_update_admin" ON public.post_reports;
CREATE POLICY "post_reports_update_admin"
ON public.post_reports FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "post_reports_delete_admin" ON public.post_reports;
CREATE POLICY "post_reports_delete_admin"
ON public.post_reports FOR DELETE
USING (public.is_admin());
