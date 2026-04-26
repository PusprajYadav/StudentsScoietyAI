-- Student Society: wallet, coin pricing, referrals, timed access, and billing helpers

CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coin_billing_model') THEN
    CREATE TYPE public.coin_billing_model AS ENUM ('per_use', 'time_pass');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coin_transaction_direction') THEN
    CREATE TYPE public.coin_transaction_direction AS ENUM ('credit', 'debit');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coin_transaction_type') THEN
    CREATE TYPE public.coin_transaction_type AS ENUM (
      'signup_bonus',
      'referral_reward',
      'admin_adjustment',
      'feature_charge',
      'feature_refund'
    );
  END IF;
END $$;

ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS signup_bonus_coins INTEGER NOT NULL DEFAULT 100
CHECK (signup_bonus_coins >= 0);

ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS referral_reward_coins INTEGER NOT NULL DEFAULT 25
CHECK (referral_reward_coins >= 0);

UPDATE public.platform_settings
SET
  signup_bonus_coins = COALESCE(signup_bonus_coins, 100),
  referral_reward_coins = COALESCE(referral_reward_coins, 25)
WHERE id = 1;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT;

UPDATE public.profiles
SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 10))
WHERE referral_code IS NULL OR btrim(referral_code) = '';

ALTER TABLE public.profiles
ALTER COLUMN referral_code SET DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 10));

ALTER TABLE public.profiles
ALTER COLUMN referral_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_referral_code_format'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_referral_code_format
      CHECK (referral_code ~ '^[A-Z0-9]{6,16}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON public.profiles(referral_code);

CREATE TABLE IF NOT EXISTS public.coin_feature_settings (
  feature_key TEXT PRIMARY KEY CHECK (feature_key ~ '^[a-z0-9_]+$'),
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  billing_model public.coin_billing_model NOT NULL DEFAULT 'per_use',
  coins_required INTEGER NOT NULL DEFAULT 0 CHECK (coins_required >= 0),
  access_key TEXT,
  duration_days INTEGER,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (
    (billing_model = 'per_use' AND access_key IS NULL AND duration_days IS NULL)
    OR (
      billing_model = 'time_pass'
      AND access_key IS NOT NULL
      AND char_length(btrim(access_key)) >= 3
      AND duration_days IS NOT NULL
      AND duration_days > 0
    )
  )
);

DROP TRIGGER IF EXISTS coin_feature_settings_set_updated_at ON public.coin_feature_settings;
CREATE TRIGGER coin_feature_settings_set_updated_at
BEFORE UPDATE ON public.coin_feature_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coin_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_credited INTEGER NOT NULL DEFAULT 0 CHECK (total_credited >= 0),
  total_debited INTEGER NOT NULL DEFAULT 0 CHECK (total_debited >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS coin_wallets_set_updated_at ON public.coin_wallets;
CREATE TRIGGER coin_wallets_set_updated_at
BEFORE UPDATE ON public.coin_wallets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.coin_wallets(user_id) ON DELETE CASCADE,
  direction public.coin_transaction_direction NOT NULL,
  transaction_type public.coin_transaction_type NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  feature_key TEXT REFERENCES public.coin_feature_settings(feature_key) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  performed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reversed_transaction_id UUID REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id_created_at
  ON public.coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_feature_key
  ON public.coin_transactions(feature_key);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference
  ON public.coin_transactions(reference_type, reference_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_transactions_user_idempotency
  ON public.coin_transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_transactions_reversed_transaction_id
  ON public.coin_transactions(reversed_transaction_id)
  WHERE reversed_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.coin_feature_access (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_key TEXT NOT NULL,
  granted_by_feature_key TEXT REFERENCES public.coin_feature_settings(feature_key) ON DELETE SET NULL,
  last_transaction_id UUID REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, access_key),
  CHECK (expires_at > activated_at)
);

CREATE INDEX IF NOT EXISTS idx_coin_feature_access_access_key
  ON public.coin_feature_access(access_key, expires_at DESC);

DROP TRIGGER IF EXISTS coin_feature_access_set_updated_at ON public.coin_feature_access;
CREATE TRIGGER coin_feature_access_set_updated_at
BEFORE UPDATE ON public.coin_feature_access
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  reward_transaction_id UUID REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (referrer_user_id <> referred_user_id),
  CHECK (referral_code_used ~ '^[A-Z0-9]{6,16}$')
);

CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_user_id
  ON public.user_referrals(referrer_user_id, created_at DESC);

INSERT INTO public.coin_feature_settings (
  feature_key,
  feature_name,
  description,
  category,
  billing_model,
  coins_required,
  access_key,
  duration_days,
  is_enabled,
  sort_order
)
VALUES
  (
    'post_create',
    'Publish Post',
    'Charge coins whenever a new discussion or community post is published.',
    'social',
    'per_use',
    1,
    NULL,
    NULL,
    TRUE,
    10
  ),
  (
    'chat_request_send',
    'Send Chat Request',
    'Charge coins when a new encrypted chat request is sent.',
    'social',
    'per_use',
    1,
    NULL,
    NULL,
    TRUE,
    20
  ),
  (
    'student_resume_create',
    'Create Resume',
    'Charge coins when a student creates a new ATS resume.',
    'creator',
    'per_use',
    10,
    NULL,
    NULL,
    TRUE,
    30
  ),
  (
    'student_portfolio_create',
    'Create Portfolio Website',
    'Charge coins when a student creates a new portfolio website.',
    'creator',
    'per_use',
    15,
    NULL,
    NULL,
    TRUE,
    40
  ),
  (
    'bulk_mailer_email_send',
    'Send Bulk Mailer Email',
    'Charge coins for each successfully sent Bulk Mailer email.',
    'business',
    'per_use',
    1,
    NULL,
    NULL,
    TRUE,
    50
  ),
  (
    'instagram_automation_day_pass',
    'Instagram Automation 1 Day',
    'Unlock Instagram Automation for 1 day.',
    'business',
    'time_pass',
    25,
    'instagram_automation_access',
    1,
    TRUE,
    60
  ),
  (
    'instagram_automation_week_pass',
    'Instagram Automation 1 Week',
    'Unlock Instagram Automation for 7 days.',
    'business',
    'time_pass',
    120,
    'instagram_automation_access',
    7,
    TRUE,
    61
  ),
  (
    'instagram_automation_month_pass',
    'Instagram Automation 1 Month',
    'Unlock Instagram Automation for 30 days.',
    'business',
    'time_pass',
    399,
    'instagram_automation_access',
    30,
    TRUE,
    62
  ),
  (
    'instagram_automation_year_pass',
    'Instagram Automation 1 Year',
    'Unlock Instagram Automation for 365 days.',
    'business',
    'time_pass',
    3999,
    'instagram_automation_access',
    365,
    TRUE,
    63
  )
ON CONFLICT (feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.ensure_coin_wallet_exists(target_user_id UUID)
RETURNS public.coin_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  wallet_row public.coin_wallets;
BEGIN
  INSERT INTO public.coin_wallets (user_id)
  VALUES (target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO wallet_row
  FROM public.coin_wallets
  WHERE user_id = target_user_id;

  RETURN wallet_row;
END;
$$;

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

  RETURN inserted_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION private.charge_feature_on_insert(
  target_user_id UUID,
  target_feature_key TEXT,
  reference_type TEXT,
  reference_id TEXT,
  charge_description TEXT,
  charge_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  feature_row public.coin_feature_settings;
BEGIN
  IF target_user_id IS NULL OR reference_id IS NULL OR btrim(reference_id) = '' THEN
    RETURN;
  END IF;

  SELECT *
  INTO feature_row
  FROM public.coin_feature_settings
  WHERE coin_feature_settings.feature_key = target_feature_key
    AND is_enabled = TRUE
  LIMIT 1;

  IF NOT FOUND OR feature_row.coins_required <= 0 OR public.is_admin(target_user_id) THEN
    RETURN;
  END IF;

  PERFORM private.apply_coin_transaction(
    target_user_id,
    feature_row.coins_required * -1,
    'feature_charge',
    feature_row.feature_key,
    reference_type,
    reference_id,
    charge_description,
    charge_metadata,
    NULL,
    format('auto-charge:%s:%s', reference_type, reference_id),
    NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_profile_coin_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
DECLARE
  signup_bonus INTEGER := 0;
  referral_reward INTEGER := 0;
  submitted_referral_code TEXT;
  referrer_profile public.profiles;
  referral_row public.user_referrals;
  reward_transaction public.coin_transactions;
BEGIN
  PERFORM private.ensure_coin_wallet_exists(NEW.id);

  SELECT
    COALESCE(signup_bonus_coins, 0),
    COALESCE(referral_reward_coins, 0)
  INTO signup_bonus, referral_reward
  FROM public.platform_settings
  WHERE id = 1;

  IF signup_bonus > 0 THEN
    PERFORM private.apply_coin_transaction(
      NEW.id,
      signup_bonus,
      'signup_bonus',
      NULL,
      'profile',
      NEW.id::text,
      'Welcome bonus',
      jsonb_build_object('source', 'signup'),
      NULL,
      format('signup-bonus:%s', NEW.id),
      NULL
    );
  END IF;

  SELECT upper(trim(coalesce(raw_user_meta_data ->> 'referral_code', '')))
  INTO submitted_referral_code
  FROM auth.users
  WHERE id = NEW.id;

  IF submitted_referral_code IS NULL OR submitted_referral_code = '' OR submitted_referral_code = NEW.referral_code THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO referrer_profile
  FROM public.profiles
  WHERE referral_code = submitted_referral_code
    AND id <> NEW.id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_referrals (
    referrer_user_id,
    referred_user_id,
    referral_code_used
  )
  VALUES (
    referrer_profile.id,
    NEW.id,
    submitted_referral_code
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING *
  INTO referral_row;

  IF referral_row.id IS NULL OR referral_reward <= 0 THEN
    RETURN NEW;
  END IF;

  reward_transaction := private.apply_coin_transaction(
    referrer_profile.id,
    referral_reward,
    'referral_reward',
    NULL,
    'user_referral',
    NEW.id::text,
    'Referral signup reward',
    jsonb_build_object(
      'referred_user_id', NEW.id,
      'referred_referral_code', submitted_referral_code
    ),
    NULL,
    format('referral-reward:%s', NEW.id),
    NULL
  );

  UPDATE public.user_referrals
  SET
    reward_transaction_id = reward_transaction.id,
    rewarded_at = reward_transaction.created_at
  WHERE id = referral_row.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_coin_setup_after_insert ON public.profiles;
CREATE TRIGGER profiles_coin_setup_after_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.handle_profile_coin_setup();

CREATE OR REPLACE FUNCTION private.prevent_referral_code_self_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF OLD.referral_code IS DISTINCT FROM NEW.referral_code
    AND auth.uid() = OLD.id
    AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Referral code cannot be changed once it is assigned.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_lock_referral_code ON public.profiles;
CREATE TRIGGER profiles_lock_referral_code
BEFORE UPDATE OF referral_code ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.prevent_referral_code_self_edit();

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

  IF feature_row.billing_model <> 'time_pass' OR feature_row.access_key IS NULL OR feature_row.duration_days IS NULL THEN
    RAISE EXCEPTION 'This feature is not sold as a timed access pass.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM private.ensure_coin_wallet_exists(actor_id);

  IF NOT public.is_admin(actor_id) AND feature_row.coins_required > 0 THEN
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
  ON CONFLICT (user_id, access_key) DO UPDATE
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
  role_name TEXT := coalesce(current_setting('request.jwt.claim.role', true), '');
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

  IF public.is_admin(target_user_id) OR feature_row.coins_required <= 0 THEN
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
    coalesce(target_description, feature_row.feature_name),
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
  role_name TEXT := coalesce(current_setting('request.jwt.claim.role', true), '');
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
    coalesce(refund_description, format('Refund for %s', coalesce(original_transaction.description, 'feature charge'))),
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

CREATE OR REPLACE FUNCTION public.admin_adjust_user_coins(
  target_user_id UUID,
  amount_delta INTEGER,
  adjustment_note TEXT DEFAULT NULL,
  adjustment_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  actor_id UUID := auth.uid();
  role_name TEXT := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet owner is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF amount_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero.'
      USING ERRCODE = 'P0001';
  END IF;

  IF role_name <> 'service_role' AND (actor_id IS NULL OR NOT public.is_admin(actor_id)) THEN
    RAISE EXCEPTION 'Only admins can adjust another user''s wallet.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN private.apply_coin_transaction(
    target_user_id,
    amount_delta,
    'admin_adjustment',
    NULL,
    'admin_adjustment',
    target_user_id::text,
    coalesce(adjustment_note, 'Admin wallet adjustment'),
    CASE
      WHEN adjustment_metadata IS NOT NULL AND jsonb_typeof(adjustment_metadata) = 'object' THEN adjustment_metadata
      ELSE '{}'::jsonb
    END,
    actor_id,
    NULL,
    NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.charge_post_create_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  PERFORM private.charge_feature_on_insert(
    NEW.author_id,
    'post_create',
    'post',
    NEW.id::text,
    'Post published',
    jsonb_build_object(
      'visibility_scope', NEW.visibility_scope,
      'discussion_kind', NEW.discussion_kind,
      'community_id', NEW.community_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_charge_coins_before_insert ON public.posts;
CREATE TRIGGER posts_charge_coins_before_insert
BEFORE INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION private.charge_post_create_coins();

CREATE OR REPLACE FUNCTION private.charge_resume_create_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  PERFORM private.charge_feature_on_insert(
    NEW.owner_id,
    'student_resume_create',
    'student_resume',
    NEW.id::text,
    'Resume created',
    jsonb_build_object('template_key', NEW.template_key)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_resumes_charge_coins_before_insert ON public.student_resumes;
CREATE TRIGGER student_resumes_charge_coins_before_insert
BEFORE INSERT ON public.student_resumes
FOR EACH ROW
EXECUTE FUNCTION private.charge_resume_create_coins();

CREATE OR REPLACE FUNCTION private.charge_portfolio_create_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  PERFORM private.charge_feature_on_insert(
    NEW.owner_id,
    'student_portfolio_create',
    'student_portfolio',
    NEW.id::text,
    'Portfolio website created',
    jsonb_build_object('template_key', NEW.template_key)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_portfolios_charge_coins_before_insert ON public.student_portfolios;
CREATE TRIGGER student_portfolios_charge_coins_before_insert
BEFORE INSERT ON public.student_portfolios
FOR EACH ROW
EXECUTE FUNCTION private.charge_portfolio_create_coins();

CREATE OR REPLACE FUNCTION private.charge_chat_request_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  PERFORM private.charge_feature_on_insert(
    NEW.sender_id,
    'chat_request_send',
    'chat_request',
    NEW.id::text,
    'Chat request sent',
    jsonb_build_object('recipient_id', NEW.recipient_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_requests_charge_coins_before_insert ON public.chat_requests;
CREATE TRIGGER chat_requests_charge_coins_before_insert
BEFORE INSERT ON public.chat_requests
FOR EACH ROW
EXECUTE FUNCTION private.charge_chat_request_coins();

INSERT INTO public.coin_wallets (user_id)
SELECT id
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
  profile_row RECORD;
  signup_bonus INTEGER := 0;
BEGIN
  SELECT COALESCE(signup_bonus_coins, 0)
  INTO signup_bonus
  FROM public.platform_settings
  WHERE id = 1;

  IF signup_bonus > 0 THEN
    FOR profile_row IN
      SELECT id
      FROM public.profiles
    LOOP
      PERFORM private.apply_coin_transaction(
        profile_row.id,
        signup_bonus,
        'signup_bonus',
        NULL,
        'profile',
        profile_row.id::text,
        'Welcome bonus',
        jsonb_build_object('source', 'migration_backfill'),
        NULL,
        format('signup-bonus:%s', profile_row.id),
        NULL
      );
    END LOOP;
  END IF;
END;
$$;

ALTER TABLE public.coin_feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coin_feature_settings_read_all" ON public.coin_feature_settings;
CREATE POLICY "coin_feature_settings_read_all"
ON public.coin_feature_settings FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "coin_feature_settings_manage_admin" ON public.coin_feature_settings;
CREATE POLICY "coin_feature_settings_manage_admin"
ON public.coin_feature_settings FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "coin_wallets_read_self_or_admin" ON public.coin_wallets;
CREATE POLICY "coin_wallets_read_self_or_admin"
ON public.coin_wallets FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "coin_transactions_read_self_or_admin" ON public.coin_transactions;
CREATE POLICY "coin_transactions_read_self_or_admin"
ON public.coin_transactions FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "coin_feature_access_read_self_or_admin" ON public.coin_feature_access;
CREATE POLICY "coin_feature_access_read_self_or_admin"
ON public.coin_feature_access FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_referrals_read_related_or_admin" ON public.user_referrals;
CREATE POLICY "user_referrals_read_related_or_admin"
ON public.user_referrals FOR SELECT
USING (
  auth.uid() = referrer_user_id
  OR auth.uid() = referred_user_id
  OR public.is_admin()
);
