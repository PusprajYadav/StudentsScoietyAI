-- Student Society: WhiteBook notebook snapshots for feed sharing and public import

CREATE TABLE IF NOT EXISTS public.student_whitebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled WhiteBook',
  snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  preview_svg TEXT,
  share_slug TEXT NOT NULL UNIQUE,
  page_count INTEGER NOT NULL DEFAULT 1 CHECK (page_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(share_slug)) BETWEEN 6 AND 120)
);

CREATE INDEX IF NOT EXISTS idx_student_whitebooks_owner_id
ON public.student_whitebooks(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_whitebooks_share_slug
ON public.student_whitebooks(share_slug);

DROP TRIGGER IF EXISTS student_whitebooks_set_updated_at ON public.student_whitebooks;
CREATE TRIGGER student_whitebooks_set_updated_at
BEFORE UPDATE ON public.student_whitebooks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_whitebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_whitebooks_public_read" ON public.student_whitebooks;
CREATE POLICY "student_whitebooks_public_read"
ON public.student_whitebooks FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "student_whitebooks_insert_owner_or_admin" ON public.student_whitebooks;
CREATE POLICY "student_whitebooks_insert_owner_or_admin"
ON public.student_whitebooks FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_whitebooks_update_owner_or_admin" ON public.student_whitebooks;
CREATE POLICY "student_whitebooks_update_owner_or_admin"
ON public.student_whitebooks FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_whitebooks_delete_owner_or_admin" ON public.student_whitebooks;
CREATE POLICY "student_whitebooks_delete_owner_or_admin"
ON public.student_whitebooks FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);
