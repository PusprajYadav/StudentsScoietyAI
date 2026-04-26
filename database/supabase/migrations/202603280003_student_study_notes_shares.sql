-- Student Society: Study Notes folder shares for feed publishing and local import

CREATE TABLE IF NOT EXISTS public.student_study_note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Shared Study Notes',
  folder_name TEXT NOT NULL DEFAULT 'General',
  snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  preview_text TEXT,
  preview_image_data_url TEXT,
  share_slug TEXT NOT NULL UNIQUE,
  entry_count INTEGER NOT NULL DEFAULT 0 CHECK (entry_count >= 0),
  attachment_count INTEGER NOT NULL DEFAULT 0 CHECK (attachment_count >= 0),
  latest_timestamp_seconds DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (latest_timestamp_seconds >= 0),
  video_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  CHECK (char_length(btrim(folder_name)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(share_slug)) BETWEEN 6 AND 160)
);

CREATE INDEX IF NOT EXISTS idx_student_study_note_shares_owner_id
ON public.student_study_note_shares(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_study_note_shares_share_slug
ON public.student_study_note_shares(share_slug);

DROP TRIGGER IF EXISTS student_study_note_shares_set_updated_at ON public.student_study_note_shares;
CREATE TRIGGER student_study_note_shares_set_updated_at
BEFORE UPDATE ON public.student_study_note_shares
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_study_note_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_study_note_shares_public_read" ON public.student_study_note_shares;
CREATE POLICY "student_study_note_shares_public_read"
ON public.student_study_note_shares FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "student_study_note_shares_insert_owner_or_admin" ON public.student_study_note_shares;
CREATE POLICY "student_study_note_shares_insert_owner_or_admin"
ON public.student_study_note_shares FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_study_note_shares_update_owner_or_admin" ON public.student_study_note_shares;
CREATE POLICY "student_study_note_shares_update_owner_or_admin"
ON public.student_study_note_shares FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_study_note_shares_delete_owner_or_admin" ON public.student_study_note_shares;
CREATE POLICY "student_study_note_shares_delete_owner_or_admin"
ON public.student_study_note_shares FOR DELETE
USING (
  auth.uid() = owner_id
  OR public.is_admin()
);
