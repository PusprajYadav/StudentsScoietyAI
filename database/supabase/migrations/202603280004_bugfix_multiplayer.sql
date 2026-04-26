-- Student Society: BugFix Lab multiplayer rooms, submissions, and shareable result snapshots

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bugfix_multiplayer_room_status') THEN
    CREATE TYPE public.bugfix_multiplayer_room_status AS ENUM (
      'waiting',
      'countdown',
      'running',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bugfix_multiplayer_participant_status') THEN
    CREATE TYPE public.bugfix_multiplayer_participant_status AS ENUM (
      'joined',
      'finished',
      'left'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bugfix_multiplayer_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'BugFix Arena',
  invite_code TEXT NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  language public.bugfix_language,
  difficulty public.bugfix_difficulty,
  round_size INTEGER NOT NULL DEFAULT 5 CHECK (round_size BETWEEN 3 AND 10),
  max_players INTEGER NOT NULL DEFAULT 8 CHECK (max_players BETWEEN 2 AND 20),
  countdown_seconds INTEGER NOT NULL DEFAULT 5 CHECK (countdown_seconds BETWEEN 3 AND 15),
  status public.bugfix_multiplayer_room_status NOT NULL DEFAULT 'waiting',
  question_snapshots JSONB NOT NULL DEFAULT '[]'::JSONB,
  points_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  countdown_started_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  CHECK (char_length(btrim(invite_code)) BETWEEN 4 AND 24)
);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_rooms_public_status
ON public.bugfix_multiplayer_rooms(is_public, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_rooms_host
ON public.bugfix_multiplayer_rooms(host_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_rooms_invite_code
ON public.bugfix_multiplayer_rooms(invite_code);

DROP TRIGGER IF EXISTS bugfix_multiplayer_rooms_set_updated_at ON public.bugfix_multiplayer_rooms;
CREATE TRIGGER bugfix_multiplayer_rooms_set_updated_at
BEFORE UPDATE ON public.bugfix_multiplayer_rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bugfix_multiplayer_participants (
  room_id UUID NOT NULL REFERENCES public.bugfix_multiplayer_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.bugfix_multiplayer_participant_status NOT NULL DEFAULT 'joined',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  finished_at TIMESTAMPTZ,
  latest_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_participants_room_status
ON public.bugfix_multiplayer_participants(room_id, status, joined_at ASC);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_participants_user
ON public.bugfix_multiplayer_participants(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS bugfix_multiplayer_participants_set_updated_at ON public.bugfix_multiplayer_participants;
CREATE TRIGGER bugfix_multiplayer_participants_set_updated_at
BEFORE UPDATE ON public.bugfix_multiplayer_participants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bugfix_multiplayer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.bugfix_multiplayer_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  question_index INTEGER NOT NULL CHECK (question_index >= 0),
  source_code TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  earned_points INTEGER NOT NULL DEFAULT 0 CHECK (earned_points >= 0),
  remaining_ms INTEGER NOT NULL DEFAULT 0 CHECK (remaining_ms >= 0),
  time_used_ms INTEGER NOT NULL DEFAULT 0 CHECK (time_used_ms >= 0),
  validation_mode TEXT NOT NULL DEFAULT 'server',
  review_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (room_id, user_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_submissions_room_user
ON public.bugfix_multiplayer_submissions(room_id, user_id, question_index ASC);

CREATE INDEX IF NOT EXISTS idx_bugfix_multiplayer_submissions_room_question
ON public.bugfix_multiplayer_submissions(room_id, question_index ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.student_bugfix_result_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.bugfix_multiplayer_rooms(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'BugFix Arena Result',
  summary_text TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  share_slug TEXT NOT NULL UNIQUE,
  room_title TEXT NOT NULL DEFAULT '',
  winner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  total_questions INTEGER NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
  final_score INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0),
  rank_position INTEGER NOT NULL DEFAULT 1 CHECK (rank_position >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  CHECK (char_length(btrim(share_slug)) BETWEEN 6 AND 160)
);

CREATE INDEX IF NOT EXISTS idx_student_bugfix_result_shares_owner
ON public.student_bugfix_result_shares(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_bugfix_result_shares_share_slug
ON public.student_bugfix_result_shares(share_slug);

DROP TRIGGER IF EXISTS student_bugfix_result_shares_set_updated_at ON public.student_bugfix_result_shares;
CREATE TRIGGER student_bugfix_result_shares_set_updated_at
BEFORE UPDATE ON public.student_bugfix_result_shares
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bugfix_multiplayer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugfix_multiplayer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugfix_multiplayer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bugfix_result_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bugfix_multiplayer_rooms_read_public_or_member_or_admin" ON public.bugfix_multiplayer_rooms;
CREATE POLICY "bugfix_multiplayer_rooms_read_public_or_member_or_admin"
ON public.bugfix_multiplayer_rooms FOR SELECT
USING (
  is_public
  OR host_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bugfix_multiplayer_participants participants
    WHERE participants.room_id = bugfix_multiplayer_rooms.id
      AND participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "bugfix_multiplayer_rooms_insert_host_or_admin" ON public.bugfix_multiplayer_rooms;
CREATE POLICY "bugfix_multiplayer_rooms_insert_host_or_admin"
ON public.bugfix_multiplayer_rooms FOR INSERT
WITH CHECK (
  host_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bugfix_multiplayer_rooms_update_host_or_admin" ON public.bugfix_multiplayer_rooms;
CREATE POLICY "bugfix_multiplayer_rooms_update_host_or_admin"
ON public.bugfix_multiplayer_rooms FOR UPDATE
USING (
  host_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  host_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bugfix_multiplayer_rooms_delete_host_or_admin" ON public.bugfix_multiplayer_rooms;
CREATE POLICY "bugfix_multiplayer_rooms_delete_host_or_admin"
ON public.bugfix_multiplayer_rooms FOR DELETE
USING (
  host_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bugfix_multiplayer_participants_read_room_member_or_admin" ON public.bugfix_multiplayer_participants;
CREATE POLICY "bugfix_multiplayer_participants_read_room_member_or_admin"
ON public.bugfix_multiplayer_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bugfix_multiplayer_rooms rooms
    WHERE rooms.id = bugfix_multiplayer_participants.room_id
      AND (
        rooms.is_public
        OR rooms.host_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.bugfix_multiplayer_participants teammates
          WHERE teammates.room_id = rooms.id
            AND teammates.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "bugfix_multiplayer_participants_insert_self_or_admin" ON public.bugfix_multiplayer_participants;
CREATE POLICY "bugfix_multiplayer_participants_insert_self_or_admin"
ON public.bugfix_multiplayer_participants FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "bugfix_multiplayer_participants_update_self_or_host_or_admin" ON public.bugfix_multiplayer_participants;
CREATE POLICY "bugfix_multiplayer_participants_update_self_or_host_or_admin"
ON public.bugfix_multiplayer_participants FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bugfix_multiplayer_rooms rooms
    WHERE rooms.id = bugfix_multiplayer_participants.room_id
      AND rooms.host_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bugfix_multiplayer_rooms rooms
    WHERE rooms.id = bugfix_multiplayer_participants.room_id
      AND rooms.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "bugfix_multiplayer_submissions_read_member_or_admin" ON public.bugfix_multiplayer_submissions;
CREATE POLICY "bugfix_multiplayer_submissions_read_member_or_admin"
ON public.bugfix_multiplayer_submissions FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.bugfix_multiplayer_participants participants
    WHERE participants.room_id = bugfix_multiplayer_submissions.room_id
      AND participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "bugfix_multiplayer_submissions_insert_self_or_admin" ON public.bugfix_multiplayer_submissions;
CREATE POLICY "bugfix_multiplayer_submissions_insert_self_or_admin"
ON public.bugfix_multiplayer_submissions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_bugfix_result_shares_public_read" ON public.student_bugfix_result_shares;
CREATE POLICY "student_bugfix_result_shares_public_read"
ON public.student_bugfix_result_shares FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "student_bugfix_result_shares_insert_owner_or_admin" ON public.student_bugfix_result_shares;
CREATE POLICY "student_bugfix_result_shares_insert_owner_or_admin"
ON public.student_bugfix_result_shares FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_bugfix_result_shares_update_owner_or_admin" ON public.student_bugfix_result_shares;
CREATE POLICY "student_bugfix_result_shares_update_owner_or_admin"
ON public.student_bugfix_result_shares FOR UPDATE
USING (
  owner_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "student_bugfix_result_shares_delete_owner_or_admin" ON public.student_bugfix_result_shares;
CREATE POLICY "student_bugfix_result_shares_delete_owner_or_admin"
ON public.student_bugfix_result_shares FOR DELETE
USING (
  owner_id = auth.uid()
  OR public.is_admin()
);
