-- Student Society: AI mention replies for tagged posts and comments

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS ai_mention_reply_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_mention_reply_max_tokens INTEGER NOT NULL DEFAULT 220
    CHECK (ai_mention_reply_max_tokens BETWEEN 32 AND 4000);

UPDATE public.platform_settings
SET ai_mention_reply_max_tokens = COALESCE(ai_mention_reply_max_tokens, 220)
WHERE id = 1;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_generation_job_id UUID;

CREATE INDEX IF NOT EXISTS idx_comments_post_id_ai_generated
  ON public.comments(post_id, is_ai_generated, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_post_reply_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  trigger_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('post', 'comment')),
  trigger_author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trigger_excerpt TEXT NOT NULL DEFAULT '',
  mentioned_username TEXT NOT NULL DEFAULT '',
  bot_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'ignored')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  ai_comment_id UUID,
  ai_response_preview TEXT,
  ai_provider_name TEXT,
  ai_model_name TEXT,
  usage_total_tokens INTEGER,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_post_reply_jobs_status_created_at
  ON public.ai_post_reply_jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_post_reply_jobs_bot_profile_id
  ON public.ai_post_reply_jobs(bot_profile_id, created_at DESC);

DROP TRIGGER IF EXISTS ai_post_reply_jobs_set_updated_at ON public.ai_post_reply_jobs;
CREATE TRIGGER ai_post_reply_jobs_set_updated_at
BEFORE UPDATE ON public.ai_post_reply_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_ai_generation_job_id_fkey'
      AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_ai_generation_job_id_fkey
      FOREIGN KEY (ai_generation_job_id) REFERENCES public.ai_post_reply_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_post_reply_jobs_ai_comment_id_fkey'
      AND table_name = 'ai_post_reply_jobs'
  ) THEN
    ALTER TABLE public.ai_post_reply_jobs
      ADD CONSTRAINT ai_post_reply_jobs_ai_comment_id_fkey
      FOREIGN KEY (ai_comment_id) REFERENCES public.comments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_post_reply_jobs_ai_comment_id_unique
  ON public.ai_post_reply_jobs(ai_comment_id)
  WHERE ai_comment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.text_mentions_username(candidate_text TEXT, candidate_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN length(public.normalize_username_value(candidate_username)) < 3 THEN FALSE
    ELSE COALESCE(candidate_text, '') ~* (
      '(^|[^a-z0-9_])@'
      || public.normalize_username_value(candidate_username)
      || '([^a-z0-9_]|$)'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.queue_ai_post_reply_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id UUID;
  target_trigger_source TEXT;
  candidate_text TEXT;
  bot_profile_id UUID;
  bot_username TEXT;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    target_post_id := NEW.id;
    target_trigger_source := 'post';
    candidate_text := trim(concat_ws(' ', NEW.title, NEW.content, NEW.poll_question));
  ELSE
    target_post_id := NEW.post_id;
    target_trigger_source := 'comment';
    candidate_text := trim(coalesce(NEW.content, ''));
  END IF;

  IF candidate_text = '' OR position('@' in candidate_text) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT platform.ai_mention_reply_profile_id, profile.username
  INTO bot_profile_id, bot_username
  FROM public.platform_settings AS platform
  LEFT JOIN public.profiles AS profile
    ON profile.id = platform.ai_mention_reply_profile_id
  WHERE platform.id = 1
  LIMIT 1;

  IF bot_profile_id IS NULL OR coalesce(bot_username, '') = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.author_id = bot_profile_id THEN
    RETURN NEW;
  END IF;

  IF NOT public.text_mentions_username(candidate_text, bot_username) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.comments AS existing_comment
    WHERE existing_comment.post_id = target_post_id
      AND existing_comment.is_ai_generated = TRUE
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ai_post_reply_jobs (
    post_id,
    trigger_comment_id,
    trigger_source,
    trigger_author_id,
    trigger_excerpt,
    mentioned_username,
    bot_profile_id,
    status,
    attempts,
    processing_started_at,
    completed_at,
    last_error,
    fallback_used
  )
  VALUES (
    target_post_id,
    CASE WHEN target_trigger_source = 'comment' THEN NEW.id ELSE NULL END,
    target_trigger_source,
    NEW.author_id,
    left(candidate_text, 1200),
    bot_username,
    bot_profile_id,
    'queued',
    0,
    NULL,
    NULL,
    NULL,
    FALSE
  )
  ON CONFLICT (post_id) DO UPDATE
  SET
    trigger_comment_id = EXCLUDED.trigger_comment_id,
    trigger_source = EXCLUDED.trigger_source,
    trigger_author_id = EXCLUDED.trigger_author_id,
    trigger_excerpt = EXCLUDED.trigger_excerpt,
    mentioned_username = EXCLUDED.mentioned_username,
    bot_profile_id = EXCLUDED.bot_profile_id,
    status = 'queued',
    processing_started_at = NULL,
    completed_at = NULL,
    last_error = NULL,
    fallback_used = FALSE,
    updated_at = timezone('utc', now())
  WHERE public.ai_post_reply_jobs.status IN ('failed', 'ignored')
    AND public.ai_post_reply_jobs.ai_comment_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_queue_ai_post_reply_job ON public.posts;
CREATE TRIGGER posts_queue_ai_post_reply_job
AFTER INSERT OR UPDATE OF title, content, poll_question ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.queue_ai_post_reply_job();

DROP TRIGGER IF EXISTS comments_queue_ai_post_reply_job ON public.comments;
CREATE TRIGGER comments_queue_ai_post_reply_job
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.queue_ai_post_reply_job();

ALTER TABLE public.ai_post_reply_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_post_reply_jobs_read_admins" ON public.ai_post_reply_jobs;
CREATE POLICY "ai_post_reply_jobs_read_admins"
ON public.ai_post_reply_jobs FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "ai_post_reply_jobs_insert_admins" ON public.ai_post_reply_jobs;
CREATE POLICY "ai_post_reply_jobs_insert_admins"
ON public.ai_post_reply_jobs FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ai_post_reply_jobs_update_admins" ON public.ai_post_reply_jobs;
CREATE POLICY "ai_post_reply_jobs_update_admins"
ON public.ai_post_reply_jobs FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ai_post_reply_jobs_delete_admins" ON public.ai_post_reply_jobs;
CREATE POLICY "ai_post_reply_jobs_delete_admins"
ON public.ai_post_reply_jobs FOR DELETE
USING (public.is_admin());
