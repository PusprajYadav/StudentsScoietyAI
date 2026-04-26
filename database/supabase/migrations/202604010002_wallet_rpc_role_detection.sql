-- Student Society: make wallet RPC role detection work for service-role calls

CREATE OR REPLACE FUNCTION public.consume_feature_coins_for_user(
  target_user_id UUID,
  target_feature_key TEXT,
  target_description TEXT DEFAULT NULL,
  target_reference_type TEXT DEFAULT NULL,
  target_reference_id TEXT DEFAULT NULL,
  target_metadata JSONB DEFAULT '{}'::jsonb,
  target_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  charged_amount INTEGER,
  balance_after INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  jwt_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  role_name TEXT := COALESCE(
    NULLIF(jwt_claims ->> 'role', ''),
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  feature_row public.coin_feature_settings;
  transaction_row public.coin_transactions;
  wallet_row public.coin_wallets;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet owner is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF actor_id IS NULL AND role_name <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF role_name <> 'service_role'
    AND actor_id IS DISTINCT FROM target_user_id
    AND NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'You cannot spend coins for another user.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO feature_row
  FROM public.coin_feature_settings
  WHERE feature_key = target_feature_key
    AND is_enabled = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This feature is not available right now.'
      USING ERRCODE = 'P0001';
  END IF;

  IF feature_row.billing_model <> 'per_use' THEN
    RAISE EXCEPTION 'This feature does not support direct per-use charging.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM private.ensure_coin_wallet_exists(target_user_id);

  SELECT *
  INTO wallet_row
  FROM public.coin_wallets
  WHERE user_id = target_user_id;

  IF feature_row.coins_required <= 0 THEN
    RETURN QUERY
    SELECT NULL::UUID, 0, wallet_row.balance;
    RETURN;
  END IF;

  transaction_row := private.apply_coin_transaction(
    target_user_id,
    feature_row.coins_required * -1,
    'feature_charge',
    feature_row.feature_key,
    target_reference_type,
    target_reference_id,
    COALESCE(target_description, feature_row.feature_name),
    CASE
      WHEN target_metadata IS NOT NULL AND jsonb_typeof(target_metadata) = 'object' THEN target_metadata
      ELSE '{}'::jsonb
    END,
    actor_id,
    target_idempotency_key,
    NULL
  );

  RETURN QUERY
  SELECT
    transaction_row.id,
    transaction_row.amount,
    transaction_row.balance_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_coin_transaction(
  target_transaction_id UUID,
  refund_description TEXT DEFAULT NULL,
  refund_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  refund_transaction_id UUID,
  balance_after INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  jwt_claims JSONB := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  role_name TEXT := COALESCE(
    NULLIF(jwt_claims ->> 'role', ''),
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  original_transaction public.coin_transactions;
  existing_refund public.coin_transactions;
  refund_transaction public.coin_transactions;
BEGIN
  IF actor_id IS NULL AND role_name <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO original_transaction
  FROM public.coin_transactions
  WHERE id = target_transaction_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original wallet transaction was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF role_name <> 'service_role' AND (actor_id IS NULL OR NOT public.is_admin(actor_id)) THEN
    RAISE EXCEPTION 'Only admins can refund wallet transactions directly.'
      USING ERRCODE = 'P0001';
  END IF;

  IF original_transaction.direction <> 'debit' THEN
    RAISE EXCEPTION 'Only debit transactions can be refunded.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO existing_refund
  FROM public.coin_transactions
  WHERE reversed_transaction_id = target_transaction_id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT existing_refund.id, existing_refund.balance_after;
    RETURN;
  END IF;

  refund_transaction := private.apply_coin_transaction(
    original_transaction.user_id,
    original_transaction.amount,
    'feature_refund',
    original_transaction.feature_key,
    original_transaction.reference_type,
    original_transaction.reference_id,
    COALESCE(refund_description, format('Refund for %s', COALESCE(original_transaction.description, 'feature charge'))),
    CASE
      WHEN refund_metadata IS NOT NULL AND jsonb_typeof(refund_metadata) = 'object' THEN refund_metadata
      ELSE '{}'::jsonb
    END || jsonb_build_object('refunded_transaction_id', target_transaction_id),
    actor_id,
    format('refund:%s', target_transaction_id),
    target_transaction_id
  );

  RETURN QUERY
  SELECT
    refund_transaction.id,
    refund_transaction.balance_after;
END;
$$;
