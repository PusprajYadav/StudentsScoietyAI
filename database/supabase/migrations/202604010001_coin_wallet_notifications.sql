-- Student Society: wallet debit/credit notifications

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'follow',
      'post_like',
      'post_comment',
      'comment_reply',
      'profile_view',
      'post_mention',
      'coin_wallet',
      'chat_request',
      'chat_message'
    )
  );

ALTER TABLE public.notification_push_preferences
  ADD COLUMN IF NOT EXISTS enable_coin_wallet_push BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION private.apply_coin_transaction(
  target_user_id UUID,
  delta_amount INTEGER,
  target_transaction_type public.coin_transaction_type,
  target_feature_key TEXT DEFAULT NULL,
  target_reference_type TEXT DEFAULT NULL,
  target_reference_id TEXT DEFAULT NULL,
  target_description TEXT DEFAULT NULL,
  target_metadata JSONB DEFAULT '{}'::jsonb,
  target_performed_by_user_id UUID DEFAULT NULL,
  target_idempotency_key TEXT DEFAULT NULL,
  target_reversed_transaction_id UUID DEFAULT NULL
)
RETURNS public.coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  wallet_row public.coin_wallets;
  existing_transaction public.coin_transactions;
  inserted_transaction public.coin_transactions;
  absolute_amount INTEGER;
  safe_metadata JSONB := '{}'::jsonb;
  notification_actor_id UUID;
  notification_message TEXT;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet owner is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF delta_amount = 0 THEN
    RAISE EXCEPTION 'Coin delta cannot be zero.'
      USING ERRCODE = 'P0001';
  END IF;

  IF target_metadata IS NOT NULL AND jsonb_typeof(target_metadata) = 'object' THEN
    safe_metadata := target_metadata;
  END IF;

  PERFORM private.ensure_coin_wallet_exists(target_user_id);

  IF target_idempotency_key IS NOT NULL AND btrim(target_idempotency_key) <> '' THEN
    SELECT *
    INTO existing_transaction
    FROM public.coin_transactions
    WHERE user_id = target_user_id
      AND idempotency_key = target_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN existing_transaction;
    END IF;
  END IF;

  SELECT *
  INTO wallet_row
  FROM public.coin_wallets
  WHERE user_id = target_user_id
  FOR UPDATE;

  absolute_amount := abs(delta_amount);

  IF wallet_row.balance + delta_amount < 0 THEN
    RAISE EXCEPTION 'You do not have enough coins for this action.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.coin_wallets
  SET
    balance = wallet_row.balance + delta_amount,
    total_credited = total_credited + CASE WHEN delta_amount > 0 THEN absolute_amount ELSE 0 END,
    total_debited = total_debited + CASE WHEN delta_amount < 0 THEN absolute_amount ELSE 0 END,
    updated_at = timezone('utc', now())
  WHERE user_id = target_user_id
  RETURNING *
  INTO wallet_row;

  INSERT INTO public.coin_transactions (
    user_id,
    direction,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    feature_key,
    reference_type,
    reference_id,
    description,
    metadata,
    performed_by_user_id,
    reversed_transaction_id,
    idempotency_key
  )
  VALUES (
    target_user_id,
    CASE WHEN delta_amount > 0 THEN 'credit'::public.coin_transaction_direction ELSE 'debit'::public.coin_transaction_direction END,
    target_transaction_type,
    absolute_amount,
    wallet_row.balance - delta_amount,
    wallet_row.balance,
    target_feature_key,
    target_reference_type,
    target_reference_id,
    target_description,
    safe_metadata,
    target_performed_by_user_id,
    target_reversed_transaction_id,
    NULLIF(btrim(coalesce(target_idempotency_key, '')), '')
  )
  RETURNING *
  INTO inserted_transaction;

  notification_actor_id := COALESCE(target_performed_by_user_id, target_user_id);
  notification_message := format(
    '%s %s. Balance: %s.%s',
    CASE WHEN delta_amount > 0 THEN 'credited' ELSE 'debited' END,
    CASE WHEN absolute_amount = 1 THEN '1 coin' ELSE absolute_amount::TEXT || ' coins' END,
    CASE WHEN wallet_row.balance = 1 THEN '1 coin' ELSE wallet_row.balance::TEXT || ' coins' END,
    CASE
      WHEN target_description IS NULL OR btrim(target_description) = '' THEN ''
      ELSE format(' %s: %s.', CASE WHEN delta_amount > 0 THEN 'Source' ELSE 'Reason' END, target_description)
    END
  );

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    post_id,
    comment_id,
    type,
    message,
    is_read
  )
  VALUES (
    target_user_id,
    notification_actor_id,
    NULL,
    NULL,
    'coin_wallet',
    notification_message,
    FALSE
  );

  RETURN inserted_transaction;
END;
$$;
