ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS max_resumes_per_user INTEGER NOT NULL DEFAULT 5
CHECK (max_resumes_per_user BETWEEN 1 AND 50);

UPDATE public.platform_settings
SET max_resumes_per_user = COALESCE(max_resumes_per_user, 5)
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.enforce_student_resume_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_resume_count INTEGER;
  resume_limit INTEGER := 5;
BEGIN
  SELECT max_resumes_per_user
  INTO resume_limit
  FROM public.platform_settings
  WHERE id = 1;

  resume_limit := GREATEST(1, COALESCE(resume_limit, 5));

  SELECT count(*)
  INTO owner_resume_count
  FROM public.student_resumes
  WHERE owner_id = NEW.owner_id;

  IF owner_resume_count >= resume_limit THEN
    RAISE EXCEPTION 'Resume limit reached. You can create up to % resumes.', resume_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
