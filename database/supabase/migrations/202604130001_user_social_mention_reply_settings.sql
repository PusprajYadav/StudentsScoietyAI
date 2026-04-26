-- Student Society: per-user AI and auto mention replies

CREATE TABLE IF NOT EXISTS public.user_mention_reply_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_provider_mode TEXT NOT NULL DEFAULT 'saved_key'
    CHECK (ai_provider_mode IN ('saved_key', 'ollama')),
  ai_provider_key_id UUID REFERENCES public.ai_teacher_provider_keys(id) ON DELETE SET NULL,
  ai_provider_model_name TEXT,
  ai_reply_scope TEXT NOT NULL DEFAULT 'everyone'
    CHECK (ai_reply_scope IN ('everyone', 'followers', 'following', 'followers_and_following', 'no_one')),
  non_ai_reply_mode TEXT NOT NULL DEFAULT 'auto_reply'
    CHECK (non_ai_reply_mode IN ('auto_reply', 'ignore')),
  second_reply_behavior TEXT NOT NULL DEFAULT 'ignore'
    CHECK (second_reply_behavior IN ('ignore', 'auto_reply')),
  ai_reply_source TEXT NOT NULL DEFAULT 'context'
    CHECK (ai_reply_source IN ('context', 'rag')),
  auto_reply_message TEXT NOT NULL DEFAULT 'Thanks for tagging me. I will reply properly soon.',
  keyword_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  rag_knowledge_base TEXT NOT NULL DEFAULT '',
  max_output_tokens INTEGER NOT NULL DEFAULT 220
    CHECK (max_output_tokens BETWEEN 32 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS user_mention_reply_settings_set_updated_at ON public.user_mention_reply_settings;
CREATE TRIGGER user_mention_reply_settings_set_updated_at
BEFORE UPDATE ON public.user_mention_reply_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_mention_reply_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  trigger_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('post', 'comment')),
  trigger_author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trigger_excerpt TEXT NOT NULL DEFAULT '',
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_username TEXT NOT NULL DEFAULT '',
  reply_mode TEXT NOT NULL CHECK (reply_mode IN ('ai', 'auto_reply')),
  reply_sequence INTEGER NOT NULL DEFAULT 1 CHECK (reply_sequence >= 1),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'ignored')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  reply_comment_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  reply_preview TEXT,
  matched_keyword TEXT,
  ai_provider_name TEXT,
  ai_model_name TEXT,
  usage_total_tokens INTEGER,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_mention_reply_jobs_status_created_at
  ON public.user_mention_reply_jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_mention_reply_jobs_target_user_created_at
  ON public.user_mention_reply_jobs(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_mention_reply_jobs_post_target_created_at
  ON public.user_mention_reply_jobs(post_id, target_user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mention_reply_jobs_reply_comment_unique
  ON public.user_mention_reply_jobs(reply_comment_id)
  WHERE reply_comment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mention_reply_jobs_comment_target_unique
  ON public.user_mention_reply_jobs(trigger_comment_id, target_user_id)
  WHERE trigger_comment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mention_reply_jobs_sequence_unique
  ON public.user_mention_reply_jobs(post_id, target_user_id, reply_sequence);

DROP TRIGGER IF EXISTS user_mention_reply_jobs_set_updated_at ON public.user_mention_reply_jobs;
CREATE TRIGGER user_mention_reply_jobs_set_updated_at
BEFORE UPDATE ON public.user_mention_reply_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_mention_reply_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mention_reply_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_mention_reply_settings_read_self" ON public.user_mention_reply_settings;
CREATE POLICY "user_mention_reply_settings_read_self"
ON public.user_mention_reply_settings FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_settings_insert_self" ON public.user_mention_reply_settings;
CREATE POLICY "user_mention_reply_settings_insert_self"
ON public.user_mention_reply_settings FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_settings_update_self" ON public.user_mention_reply_settings;
CREATE POLICY "user_mention_reply_settings_update_self"
ON public.user_mention_reply_settings FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_settings_delete_self" ON public.user_mention_reply_settings;
CREATE POLICY "user_mention_reply_settings_delete_self"
ON public.user_mention_reply_settings FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_jobs_read_self" ON public.user_mention_reply_jobs;
CREATE POLICY "user_mention_reply_jobs_read_self"
ON public.user_mention_reply_jobs FOR SELECT
USING (auth.uid() = target_user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_jobs_insert_admins" ON public.user_mention_reply_jobs;
CREATE POLICY "user_mention_reply_jobs_insert_admins"
ON public.user_mention_reply_jobs FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_jobs_update_admins" ON public.user_mention_reply_jobs;
CREATE POLICY "user_mention_reply_jobs_update_admins"
ON public.user_mention_reply_jobs FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_mention_reply_jobs_delete_admins" ON public.user_mention_reply_jobs;
CREATE POLICY "user_mention_reply_jobs_delete_admins"
ON public.user_mention_reply_jobs FOR DELETE
USING (public.is_admin());
