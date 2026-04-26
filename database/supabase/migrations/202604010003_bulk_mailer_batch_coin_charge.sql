-- Student Society: allow aggregated per-feature coin charging for bulk actions

CREATE OR REPLACE FUNCTION public.charge_feature_coins_for_quantity(
  target_user_id UUID,
  target_feature_key TEXT,
  target_quantity INTEGER,
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
  normalized_quantity INTEGER := COALESCE(target_quantity, 0);
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet owner is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF normalized_quantity <= 0 THEN
    RAISE EXCEPTION 'Charge quantity must be at least 1.'
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
    feature_row.coins_required * normalized_quantity * -1,
    'feature_charge',
    feature_row.feature_key,
    target_reference_type,
    target_reference_id,
    COALESCE(target_description, feature_row.feature_name),
    CASE
      WHEN target_metadata IS NOT NULL AND jsonb_typeof(target_metadata) = 'object' THEN target_metadata
      ELSE '{}'::jsonb
    END || jsonb_build_object(
      'charge_quantity', normalized_quantity,
      'coins_per_unit', feature_row.coins_required
    ),
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
