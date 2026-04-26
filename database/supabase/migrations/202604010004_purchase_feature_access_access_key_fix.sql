-- Student Society: fix purchase_feature_access access_key ambiguity

CREATE OR REPLACE FUNCTION public.purchase_feature_access(target_feature_key TEXT)
RETURNS TABLE (
  transaction_id UUID,
  charged_amount INTEGER,
  balance_after INTEGER,
  access_key TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  feature_row public.coin_feature_settings;
  transaction_row public.coin_transactions;
  wallet_row public.coin_wallets;
  access_row public.coin_feature_access;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to use wallet features.'
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

  IF feature_row.billing_model <> 'time_pass'
    OR feature_row.access_key IS NULL
    OR feature_row.duration_days IS NULL THEN
    RAISE EXCEPTION 'This feature is not sold as a timed access pass.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM private.ensure_coin_wallet_exists(actor_id);

  IF feature_row.coins_required > 0 THEN
    transaction_row := private.apply_coin_transaction(
      actor_id,
      feature_row.coins_required * -1,
      'feature_charge',
      feature_row.feature_key,
      'coin_feature_access',
      feature_row.access_key,
      feature_row.feature_name,
      jsonb_build_object(
        'access_key', feature_row.access_key,
        'duration_days', feature_row.duration_days
      ),
      actor_id,
      NULL,
      NULL
    );
  END IF;

  INSERT INTO public.coin_feature_access AS access_grants (
    user_id,
    access_key,
    granted_by_feature_key,
    last_transaction_id,
    activated_at,
    expires_at
  )
  VALUES (
    actor_id,
    feature_row.access_key,
    feature_row.feature_key,
    transaction_row.id,
    timezone('utc', now()),
    timezone('utc', now()) + make_interval(days => feature_row.duration_days)
  )
  ON CONFLICT ON CONSTRAINT coin_feature_access_pkey DO UPDATE
  SET
    granted_by_feature_key = EXCLUDED.granted_by_feature_key,
    last_transaction_id = COALESCE(EXCLUDED.last_transaction_id, access_grants.last_transaction_id),
    activated_at = CASE
      WHEN access_grants.expires_at > timezone('utc', now()) THEN access_grants.activated_at
      ELSE timezone('utc', now())
    END,
    expires_at = (
      CASE
        WHEN access_grants.expires_at > timezone('utc', now()) THEN access_grants.expires_at
        ELSE timezone('utc', now())
      END
    ) + make_interval(days => feature_row.duration_days),
    updated_at = timezone('utc', now())
  RETURNING *
  INTO access_row;

  SELECT *
  INTO wallet_row
  FROM public.coin_wallets
  WHERE user_id = actor_id;

  RETURN QUERY
  SELECT
    transaction_row.id,
    COALESCE(transaction_row.amount, 0),
    COALESCE(transaction_row.balance_after, wallet_row.balance),
    access_row.access_key,
    access_row.expires_at;
END;
$$;
