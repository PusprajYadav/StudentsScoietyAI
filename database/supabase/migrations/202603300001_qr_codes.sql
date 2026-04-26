-- Student Society: dynamic QR codes with owner dashboard and public short-link resolution

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled dynamic QR',
  short_code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'url',
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  scan_count BIGINT NOT NULL DEFAULT 0 CHECK (scan_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(short_code)) BETWEEN 4 AND 32),
  CHECK (type IN ('url', 'text', 'email', 'phone'))
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_owner_updated_at
ON public.qr_codes(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_codes_short_code
ON public.qr_codes(short_code);

DROP TRIGGER IF EXISTS qr_codes_set_updated_at ON public.qr_codes;
CREATE TRIGGER qr_codes_set_updated_at
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_codes_read_owner_or_admin" ON public.qr_codes;
CREATE POLICY "qr_codes_read_owner_or_admin"
ON public.qr_codes FOR SELECT
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "qr_codes_insert_owner_or_admin" ON public.qr_codes;
CREATE POLICY "qr_codes_insert_owner_or_admin"
ON public.qr_codes FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "qr_codes_update_owner_or_admin" ON public.qr_codes;
CREATE POLICY "qr_codes_update_owner_or_admin"
ON public.qr_codes FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "qr_codes_delete_owner_or_admin" ON public.qr_codes;
CREATE POLICY "qr_codes_delete_owner_or_admin"
ON public.qr_codes FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);

CREATE OR REPLACE FUNCTION public.resolve_qr_code(input_short_code TEXT)
RETURNS TABLE (
  id UUID,
  short_code TEXT,
  title TEXT,
  target_url TEXT,
  type TEXT,
  scan_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved public.qr_codes%ROWTYPE;
BEGIN
  UPDATE public.qr_codes
  SET scan_count = scan_count + 1
  WHERE short_code = btrim(input_short_code)
  RETURNING *
  INTO resolved;

  IF resolved.id IS NULL THEN
    RETURN;
  END IF;

  id := resolved.id;
  short_code := resolved.short_code;
  title := resolved.title;
  target_url := resolved.target_url;
  type := resolved.type;
  scan_count := resolved.scan_count;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_qr_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_qr_code(TEXT) TO anon, authenticated;
