-- Student Society: moderation log support for comment-level admin actions

ALTER TABLE public.moderation_actions
  ADD COLUMN IF NOT EXISTS target_comment_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'moderation_actions_target_comment_fkey'
      AND table_name = 'moderation_actions'
  ) THEN
    ALTER TABLE public.moderation_actions
      ADD CONSTRAINT moderation_actions_target_comment_fkey
      FOREIGN KEY (target_comment_id) REFERENCES public.comments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_comment_id
ON public.moderation_actions(target_comment_id);
