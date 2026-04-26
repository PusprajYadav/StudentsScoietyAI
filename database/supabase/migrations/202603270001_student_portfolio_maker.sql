-- Student Society: portfolio website builder with private editing and public live sharing

ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS max_portfolios_per_user INTEGER NOT NULL DEFAULT 5
CHECK (max_portfolios_per_user BETWEEN 1 AND 50);

UPDATE public.platform_settings
SET max_portfolios_per_user = COALESCE(max_portfolios_per_user, 5)
WHERE id = 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'portfolio_template_key'
  ) THEN
    CREATE TYPE public.portfolio_template_key AS ENUM (
      'minimal_hero',
      'bold_cards',
      'creative_timeline'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled portfolio',
  template_key public.portfolio_template_key NOT NULL DEFAULT 'minimal_hero',
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  theme JSONB NOT NULL DEFAULT '{}'::JSONB,
  share_slug TEXT NOT NULL UNIQUE,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(share_slug)) BETWEEN 6 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_student_portfolios_owner_id
ON public.student_portfolios(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_portfolios_live
ON public.student_portfolios(is_live, updated_at DESC);

DROP TRIGGER IF EXISTS student_portfolios_set_updated_at ON public.student_portfolios;
CREATE TRIGGER student_portfolios_set_updated_at
BEFORE UPDATE ON public.student_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.touch_student_portfolio_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_live = TRUE AND (OLD.is_live IS DISTINCT FROM TRUE OR OLD.published_at IS NULL) THEN
    NEW.published_at = timezone('utc', now());
  ELSIF NEW.is_live = FALSE THEN
    NEW.published_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_portfolios_touch_publication ON public.student_portfolios;
CREATE TRIGGER student_portfolios_touch_publication
BEFORE UPDATE ON public.student_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.touch_student_portfolio_publication();

CREATE OR REPLACE FUNCTION public.enforce_student_portfolio_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_portfolio_count INTEGER;
  portfolio_limit INTEGER := 5;
BEGIN
  SELECT max_portfolios_per_user
  INTO portfolio_limit
  FROM public.platform_settings
  WHERE id = 1;

  portfolio_limit := GREATEST(1, COALESCE(portfolio_limit, 5));

  SELECT count(*)
  INTO owner_portfolio_count
  FROM public.student_portfolios
  WHERE owner_id = NEW.owner_id;

  IF owner_portfolio_count >= portfolio_limit THEN
    RAISE EXCEPTION 'Portfolio limit reached. You can create up to % portfolios.', portfolio_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_portfolios_limit_before_insert ON public.student_portfolios;
CREATE TRIGGER student_portfolios_limit_before_insert
BEFORE INSERT ON public.student_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_portfolio_limit();

ALTER TABLE public.student_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_portfolios_read_owner_or_live_or_admin" ON public.student_portfolios;
CREATE POLICY "student_portfolios_read_owner_or_live_or_admin"
ON public.student_portfolios FOR SELECT
USING (
  auth.uid() = owner_id
  OR is_live = TRUE
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_portfolios_insert_owner_or_admin" ON public.student_portfolios;
CREATE POLICY "student_portfolios_insert_owner_or_admin"
ON public.student_portfolios FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_portfolios_update_owner_or_admin" ON public.student_portfolios;
CREATE POLICY "student_portfolios_update_owner_or_admin"
ON public.student_portfolios FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_portfolios_delete_owner_or_admin" ON public.student_portfolios;
CREATE POLICY "student_portfolios_delete_owner_or_admin"
ON public.student_portfolios FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);

