-- Student Society: ATS resume maker with private editing and public live sharing

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'resume_template_key'
  ) THEN
    CREATE TYPE public.resume_template_key AS ENUM (
      'ats_classic',
      'sidebar_professional',
      'executive_dark'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled resume',
  template_key public.resume_template_key NOT NULL DEFAULT 'ats_classic',
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  share_slug TEXT NOT NULL UNIQUE,
  is_live BOOLEAN NOT NULL DEFAULT FALSE,
  page_count INTEGER NOT NULL DEFAULT 1 CHECK (page_count >= 1),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(share_slug)) BETWEEN 6 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_student_resumes_owner_id
ON public.student_resumes(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_resumes_live
ON public.student_resumes(is_live, updated_at DESC);

DROP TRIGGER IF EXISTS student_resumes_set_updated_at ON public.student_resumes;
CREATE TRIGGER student_resumes_set_updated_at
BEFORE UPDATE ON public.student_resumes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.touch_student_resume_publication()
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

DROP TRIGGER IF EXISTS student_resumes_touch_publication ON public.student_resumes;
CREATE TRIGGER student_resumes_touch_publication
BEFORE UPDATE ON public.student_resumes
FOR EACH ROW
EXECUTE FUNCTION public.touch_student_resume_publication();

CREATE OR REPLACE FUNCTION public.enforce_student_resume_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_resume_count INTEGER;
BEGIN
  SELECT count(*)
  INTO owner_resume_count
  FROM public.student_resumes
  WHERE owner_id = NEW.owner_id;

  IF owner_resume_count >= 5 THEN
    RAISE EXCEPTION 'Resume limit reached. You can create up to 5 resumes.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_resumes_limit_before_insert ON public.student_resumes;
CREATE TRIGGER student_resumes_limit_before_insert
BEFORE INSERT ON public.student_resumes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_resume_limit();

ALTER TABLE public.student_resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_resumes_read_owner_or_live_or_admin" ON public.student_resumes;
CREATE POLICY "student_resumes_read_owner_or_live_or_admin"
ON public.student_resumes FOR SELECT
USING (
  auth.uid() = owner_id
  OR is_live = TRUE
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_resumes_insert_owner_or_admin" ON public.student_resumes;
CREATE POLICY "student_resumes_insert_owner_or_admin"
ON public.student_resumes FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_resumes_update_owner_or_admin" ON public.student_resumes;
CREATE POLICY "student_resumes_update_owner_or_admin"
ON public.student_resumes FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_resumes_delete_owner_or_admin" ON public.student_resumes;
CREATE POLICY "student_resumes_delete_owner_or_admin"
ON public.student_resumes FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);
