-- Student Society: account deletion request flow with self-serve cancel support

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_deletion_request_status') THEN
    CREATE TYPE public.account_deletion_request_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.account_deletion_request_status NOT NULL DEFAULT 'pending',
  email TEXT,
  username_snapshot TEXT NOT NULL,
  full_name_snapshot TEXT NOT NULL DEFAULT '',
  reason TEXT,
  review_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id_created_at
  ON public.account_deletion_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status_created_at
  ON public.account_deletion_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_pending_per_user
  ON public.account_deletion_requests(user_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS account_deletion_requests_set_updated_at ON public.account_deletion_requests;
CREATE TRIGGER account_deletion_requests_set_updated_at
BEFORE UPDATE ON public.account_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_deletion_requests_read_self_or_admin" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_read_self_or_admin"
ON public.account_deletion_requests FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "account_deletion_requests_insert_self_or_admin" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_insert_self_or_admin"
ON public.account_deletion_requests FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "account_deletion_requests_update_admin" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_update_admin"
ON public.account_deletion_requests FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "account_deletion_requests_delete_pending_self_or_admin" ON public.account_deletion_requests;
CREATE POLICY "account_deletion_requests_delete_pending_self_or_admin"
ON public.account_deletion_requests FOR DELETE
USING ((auth.uid() = user_id AND status = 'pending') OR public.is_admin());
