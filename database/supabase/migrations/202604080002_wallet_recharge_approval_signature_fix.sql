-- Student Society: fix wallet recharge approval call into private.apply_coin_transaction

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
