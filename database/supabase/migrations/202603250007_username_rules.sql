-- Student Society: stronger username normalization and reliable auth-trigger profile creation

CREATE OR REPLACE FUNCTION public.normalize_username_value(raw_username TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT substring(
    regexp_replace(lower(trim(coalesce(raw_username, ''))), '[^a-z0-9_]', '', 'g')
    FROM 1 FOR 24
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_username(base_username TEXT, target_user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_base TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
  fallback_seed TEXT := substring(coalesce(target_user_id::text, gen_random_uuid()::text), 1, 8);
BEGIN
  normalized_base := public.normalize_username_value(base_username);

  IF normalized_base !~ '^[a-z0-9_]{3,24}$' THEN
    normalized_base := 'student_' || fallback_seed;
  END IF;

  candidate := normalized_base;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = candidate
      AND (target_user_id IS NULL OR id <> target_user_id)
  ) LOOP
    suffix := suffix + 1;
    candidate := left(normalized_base, 24 - length(suffix::text)) || suffix::text;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_username_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.username := public.normalize_username_value(NEW.username);

  IF NEW.username !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'Username must be 3-24 characters and use only lowercase letters, numbers, and underscores.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_rules ON public.profiles;
CREATE TRIGGER profiles_username_rules
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_username_rules();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_username TEXT;
BEGIN
  requested_username := new.raw_user_meta_data ->> 'username';

  INSERT INTO public.profiles (
    id,
    username,
    full_name
  )
  VALUES (
    new.id,
    public.generate_unique_username(requested_username, new.id),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = excluded.full_name;

  RETURN new;
END;
$$;

UPDATE public.profiles
SET username = public.normalize_username_value(username)
WHERE username <> public.normalize_username_value(username);
