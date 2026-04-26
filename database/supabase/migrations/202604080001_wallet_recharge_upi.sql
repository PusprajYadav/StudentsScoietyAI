-- Student Society: manual UPI wallet recharge with admin approval

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.coin_transaction_type'::regtype
      AND enumlabel = 'wallet_recharge'
  ) THEN
    ALTER TYPE public.coin_transaction_type ADD VALUE 'wallet_recharge';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_recharge_status') THEN
    CREATE TYPE public.wallet_recharge_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_upi_settings (
  id BIGINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  upi_id TEXT NOT NULL CHECK (position('@' in btrim(upi_id)) > 1),
  merchant_name TEXT NOT NULL DEFAULT 'Student Society',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS wallet_upi_settings_set_updated_at ON public.wallet_upi_settings;
CREATE TRIGGER wallet_upi_settings_set_updated_at
BEFORE UPDATE ON public.wallet_upi_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.wallet_recharge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins_requested INTEGER NOT NULL CHECK (coins_requested >= 1 AND coins_requested <= 10000),
  upi_id_used TEXT NOT NULL,
  merchant_name_used TEXT NOT NULL,
  qr_payload TEXT NOT NULL,
  upi_reference TEXT NOT NULL CHECK (char_length(btrim(upi_reference)) >= 4),
  payment_note TEXT,
  status public.wallet_recharge_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_coin_transaction_id UUID REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_wallet_recharge_requests_user_id_created_at
  ON public.wallet_recharge_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_recharge_requests_status_created_at
  ON public.wallet_recharge_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_recharge_requests_approved_coin_transaction_id
  ON public.wallet_recharge_requests(approved_coin_transaction_id)
  WHERE approved_coin_transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.generate_wallet_recharge_order_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := format(
      'WR-%s-%s',
      to_char(timezone('utc', now()), 'YYYYMMDD'),
      upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 8))
    );

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.wallet_recharge_requests
      WHERE order_id = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION private.prepare_wallet_recharge_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  NEW.order_id := nullif(upper(btrim(coalesce(NEW.order_id, ''))), '');
  IF NEW.order_id IS NULL THEN
    NEW.order_id := private.generate_wallet_recharge_order_id();
  END IF;

  NEW.upi_id_used := btrim(coalesce(NEW.upi_id_used, ''));
  NEW.merchant_name_used := btrim(coalesce(NEW.merchant_name_used, ''));
  NEW.qr_payload := btrim(coalesce(NEW.qr_payload, ''));
  NEW.upi_reference := nullif(regexp_replace(coalesce(NEW.upi_reference, ''), '\s+', '', 'g'), '');
  NEW.payment_note := nullif(btrim(coalesce(NEW.payment_note, '')), '');
  NEW.admin_note := nullif(btrim(coalesce(NEW.admin_note, '')), '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_recharge_requests_prepare_before_insert ON public.wallet_recharge_requests;
CREATE TRIGGER wallet_recharge_requests_prepare_before_insert
BEFORE INSERT ON public.wallet_recharge_requests
FOR EACH ROW
EXECUTE FUNCTION private.prepare_wallet_recharge_request();

DROP TRIGGER IF EXISTS wallet_recharge_requests_set_updated_at ON public.wallet_recharge_requests;
CREATE TRIGGER wallet_recharge_requests_set_updated_at
BEFORE UPDATE ON public.wallet_recharge_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.approve_wallet_recharge_request(
  target_request_id UUID,
  admin_review_note TEXT DEFAULT NULL
)
RETURNS public.wallet_recharge_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  request_row public.wallet_recharge_requests;
  credit_transaction public.coin_transactions;
  normalized_note TEXT := nullif(btrim(coalesce(admin_review_note, '')), '');
BEGIN
  IF actor_id IS NULL OR NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'Only admins can approve wallet recharge requests.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO request_row
  FROM public.wallet_recharge_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet recharge request not found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF request_row.status <> 'pending' THEN
    RAISE EXCEPTION 'This wallet recharge request is no longer pending.'
      USING ERRCODE = 'P0001';
  END IF;

  credit_transaction := private.apply_coin_transaction(
    request_row.user_id,
    request_row.coins_requested,
    'wallet_recharge'::public.coin_transaction_type,
    NULL::text,
    'wallet_recharge_request'::text,
    request_row.id::text,
    coalesce(
      normalized_note,
      format('Wallet recharge approved • %s coins', request_row.coins_requested)
    )::text,
    jsonb_build_object(
      'request_id', request_row.id,
      'order_id', request_row.order_id,
      'coins_requested', request_row.coins_requested,
      'amount_inr', request_row.coins_requested,
      'upi_reference', request_row.upi_reference,
      'upi_id_used', request_row.upi_id_used
    ),
    actor_id,
    format('wallet-recharge-approval:%s', request_row.id::text),
    NULL::uuid
  );

  UPDATE public.wallet_recharge_requests
  SET
    status = 'approved',
    admin_note = normalized_note,
    reviewed_by_user_id = actor_id,
    reviewed_at = timezone('utc', now()),
    approved_coin_transaction_id = credit_transaction.id,
    updated_at = timezone('utc', now())
  WHERE id = request_row.id
  RETURNING *
  INTO request_row;

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_wallet_recharge_request(
  target_request_id UUID,
  admin_review_note TEXT DEFAULT NULL
)
RETURNS public.wallet_recharge_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  request_row public.wallet_recharge_requests;
  normalized_note TEXT := nullif(btrim(coalesce(admin_review_note, '')), '');
BEGIN
  IF actor_id IS NULL OR NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'Only admins can reject wallet recharge requests.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.wallet_recharge_requests
  SET
    status = 'rejected',
    admin_note = normalized_note,
    reviewed_by_user_id = actor_id,
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = target_request_id
    AND status = 'pending'
  RETURNING *
  INTO request_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This wallet recharge request is no longer pending.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN request_row;
END;
$$;

ALTER TABLE public.wallet_upi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_recharge_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_upi_settings_read_active_or_admin" ON public.wallet_upi_settings;
CREATE POLICY "wallet_upi_settings_read_active_or_admin"
ON public.wallet_upi_settings FOR SELECT
USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "wallet_upi_settings_insert_admin" ON public.wallet_upi_settings;
CREATE POLICY "wallet_upi_settings_insert_admin"
ON public.wallet_upi_settings FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "wallet_upi_settings_update_admin" ON public.wallet_upi_settings;
CREATE POLICY "wallet_upi_settings_update_admin"
ON public.wallet_upi_settings FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "wallet_upi_settings_delete_admin" ON public.wallet_upi_settings;
CREATE POLICY "wallet_upi_settings_delete_admin"
ON public.wallet_upi_settings FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "wallet_recharge_requests_read_self_or_admin" ON public.wallet_recharge_requests;
CREATE POLICY "wallet_recharge_requests_read_self_or_admin"
ON public.wallet_recharge_requests FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "wallet_recharge_requests_insert_self" ON public.wallet_recharge_requests;
CREATE POLICY "wallet_recharge_requests_insert_self"
ON public.wallet_recharge_requests FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND reviewed_by_user_id IS NULL
  AND reviewed_at IS NULL
  AND approved_coin_transaction_id IS NULL
);

DROP POLICY IF EXISTS "wallet_recharge_requests_update_admin" ON public.wallet_recharge_requests;
CREATE POLICY "wallet_recharge_requests_update_admin"
ON public.wallet_recharge_requests FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());
