-- Student Society: Instagram Automation V2
-- Unified rules, cached media/comments, webhook event durability, and richer execution logs.

ALTER TABLE public.instagram_accounts
  ADD COLUMN IF NOT EXISTS page_tasks JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  ig_media_id TEXT NOT NULL UNIQUE,
  caption TEXT,
  media_type TEXT,
  media_product_type TEXT,
  permalink TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_account_id
  ON public.instagram_posts(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_published_at
  ON public.instagram_posts(published_at DESC);

DROP TRIGGER IF EXISTS instagram_posts_set_updated_at ON public.instagram_posts;
CREATE TRIGGER instagram_posts_set_updated_at
BEFORE UPDATE ON public.instagram_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_post_id UUID REFERENCES public.instagram_posts(id) ON DELETE SET NULL,
  ig_media_id TEXT NOT NULL,
  ig_comment_id TEXT NOT NULL UNIQUE,
  parent_comment_id TEXT,
  commenter_ig_user_id TEXT,
  commenter_username TEXT,
  comment_text TEXT NOT NULL,
  commented_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'webhook' CHECK (source IN ('webhook', 'sync')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_instagram_comments_account_id
  ON public.instagram_comments(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_media_id
  ON public.instagram_comments(ig_media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_sender_id
  ON public.instagram_comments(commenter_ig_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_commented_at
  ON public.instagram_comments(commented_at DESC);

DROP TRIGGER IF EXISTS instagram_comments_set_updated_at ON public.instagram_comments;
CREATE TRIGGER instagram_comments_set_updated_at
BEFORE UPDATE ON public.instagram_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  rule_kind TEXT NOT NULL CHECK (rule_kind IN ('comment', 'dm', 'comment_dm')),
  rule_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment_created', 'dm_received')),
  scope_media_id TEXT,
  match_mode TEXT NOT NULL DEFAULT 'contains_any' CHECK (match_mode IN ('contains_any', 'contains_all', 'exact', 'regex')),
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment_reply_text TEXT,
  comment_reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  private_reply_text TEXT,
  private_reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  dm_reply_text TEXT,
  dm_reply_variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_comment_reply_text TEXT,
  fallback_dm_reply_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  delay_min_seconds INTEGER NOT NULL DEFAULT 2 CHECK (delay_min_seconds BETWEEN 0 AND 60),
  delay_max_seconds INTEGER NOT NULL DEFAULT 5 CHECK (delay_max_seconds BETWEEN 0 AND 60),
  daily_limit_per_sender INTEGER NOT NULL DEFAULT 1 CHECK (daily_limit_per_sender >= 0),
  cooldown_seconds INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_seconds >= 0),
  legacy_source_table TEXT,
  legacy_source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (delay_max_seconds >= delay_min_seconds),
  CONSTRAINT instagram_automation_rules_legacy_source_unique UNIQUE (legacy_source_table, legacy_source_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_automation_rules_user_trigger
  ON public.instagram_automation_rules(user_id, trigger_type, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_rules_account_id
  ON public.instagram_automation_rules(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_rules_scope_media_id
  ON public.instagram_automation_rules(scope_media_id);

DROP TRIGGER IF EXISTS instagram_automation_rules_set_updated_at ON public.instagram_automation_rules;
CREATE TRIGGER instagram_automation_rules_set_updated_at
BEFORE UPDATE ON public.instagram_automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.instagram_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('comment_created', 'dm_received')),
  entry_id TEXT,
  delivery_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'ignored', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_instagram_webhook_events_account_status
  ON public.instagram_webhook_events(instagram_account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_webhook_events_user_id
  ON public.instagram_webhook_events(user_id);

DROP TRIGGER IF EXISTS instagram_webhook_events_set_updated_at ON public.instagram_webhook_events;
CREATE TRIGGER instagram_webhook_events_set_updated_at
BEFORE UPDATE ON public.instagram_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.instagram_automation_logs
  ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES public.instagram_automation_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS webhook_event_id UUID REFERENCES public.instagram_webhook_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS execution_key TEXT,
  ADD COLUMN IF NOT EXISTS sender_ig_user_id TEXT,
  ADD COLUMN IF NOT EXISTS payload_r2_key TEXT;

CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_rule_id
  ON public.instagram_automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_webhook_event_id
  ON public.instagram_automation_logs(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_instagram_automation_logs_sender_ig_user_id
  ON public.instagram_automation_logs(sender_ig_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_automation_logs_execution_key
  ON public.instagram_automation_logs(execution_key)
  WHERE execution_key IS NOT NULL;

INSERT INTO public.instagram_automation_rules (
  user_id,
  instagram_account_id,
  rule_kind,
  rule_name,
  trigger_type,
  scope_media_id,
  match_mode,
  keywords,
  negative_keywords,
  comment_reply_text,
  comment_reply_variants,
  is_active,
  priority,
  delay_min_seconds,
  delay_max_seconds,
  daily_limit_per_sender,
  cooldown_seconds,
  legacy_source_table,
  legacy_source_id
)
SELECT
  user_id,
  instagram_account_id,
  'comment',
  COALESCE(NULLIF(TRIM(keyword), ''), 'Comment reply'),
  'comment_created',
  media_id,
  'contains_any',
  COALESCE(keyword_list, '[]'::jsonb) || to_jsonb(ARRAY[NULLIF(TRIM(keyword), '')]),
  '[]'::jsonb,
  reply_text,
  COALESCE(reply_variants, '[]'::jsonb),
  is_active,
  priority,
  delay_min_seconds,
  delay_max_seconds,
  1,
  0,
  'instagram_comment_rules',
  id
FROM public.instagram_comment_rules
ON CONFLICT (legacy_source_table, legacy_source_id) DO NOTHING;

INSERT INTO public.instagram_automation_rules (
  user_id,
  instagram_account_id,
  rule_kind,
  rule_name,
  trigger_type,
  scope_media_id,
  match_mode,
  keywords,
  negative_keywords,
  dm_reply_text,
  dm_reply_variants,
  fallback_dm_reply_text,
  is_active,
  priority,
  delay_min_seconds,
  delay_max_seconds,
  daily_limit_per_sender,
  cooldown_seconds,
  legacy_source_table,
  legacy_source_id
)
SELECT
  user_id,
  instagram_account_id,
  'dm',
  COALESCE(NULLIF(TRIM(keyword), ''), 'DM reply'),
  'dm_received',
  NULL,
  'contains_any',
  COALESCE(keyword_list, '[]'::jsonb) || to_jsonb(ARRAY[NULLIF(TRIM(keyword), '')]),
  '[]'::jsonb,
  reply_text,
  COALESCE(reply_variants, '[]'::jsonb),
  NULL,
  is_active,
  priority,
  delay_min_seconds,
  delay_max_seconds,
  1,
  0,
  'instagram_dm_rules',
  id
FROM public.instagram_dm_rules
ON CONFLICT (legacy_source_table, legacy_source_id) DO NOTHING;

INSERT INTO public.instagram_automation_rules (
  user_id,
  instagram_account_id,
  rule_kind,
  rule_name,
  trigger_type,
  scope_media_id,
  match_mode,
  keywords,
  negative_keywords,
  comment_reply_text,
  comment_reply_variants,
  private_reply_text,
  private_reply_variants,
  is_active,
  priority,
  delay_min_seconds,
  delay_max_seconds,
  daily_limit_per_sender,
  cooldown_seconds,
  legacy_source_table,
  legacy_source_id
)
SELECT
  user_id,
  instagram_account_id,
  'comment_dm',
  COALESCE(NULLIF(TRIM(trigger_keyword), ''), 'Comment to DM'),
  'comment_created',
  media_id,
  'contains_any',
  COALESCE(trigger_keyword_list, '[]'::jsonb) || to_jsonb(ARRAY[NULLIF(TRIM(trigger_keyword), '')]),
  '[]'::jsonb,
  comment_reply_text,
  COALESCE(comment_reply_variants, '[]'::jsonb),
  dm_reply_text,
  COALESCE(dm_reply_variants, '[]'::jsonb),
  is_active,
  priority,
  delay_min_seconds,
  delay_max_seconds,
  1,
  0,
  'instagram_comment_dm_rules',
  id
FROM public.instagram_comment_dm_rules
ON CONFLICT (legacy_source_table, legacy_source_id) DO NOTHING;

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instagram_posts_read_owner_or_admin" ON public.instagram_posts;
CREATE POLICY "instagram_posts_read_owner_or_admin"
ON public.instagram_posts FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_posts_insert_owner_or_admin" ON public.instagram_posts;
CREATE POLICY "instagram_posts_insert_owner_or_admin"
ON public.instagram_posts FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_posts_update_owner_or_admin" ON public.instagram_posts;
CREATE POLICY "instagram_posts_update_owner_or_admin"
ON public.instagram_posts FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_posts_delete_owner_or_admin" ON public.instagram_posts;
CREATE POLICY "instagram_posts_delete_owner_or_admin"
ON public.instagram_posts FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comments_read_owner_or_admin" ON public.instagram_comments;
CREATE POLICY "instagram_comments_read_owner_or_admin"
ON public.instagram_comments FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comments_insert_owner_or_admin" ON public.instagram_comments;
CREATE POLICY "instagram_comments_insert_owner_or_admin"
ON public.instagram_comments FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comments_update_owner_or_admin" ON public.instagram_comments;
CREATE POLICY "instagram_comments_update_owner_or_admin"
ON public.instagram_comments FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_comments_delete_owner_or_admin" ON public.instagram_comments;
CREATE POLICY "instagram_comments_delete_owner_or_admin"
ON public.instagram_comments FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_rules_read_owner_or_admin" ON public.instagram_automation_rules;
CREATE POLICY "instagram_automation_rules_read_owner_or_admin"
ON public.instagram_automation_rules FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_rules_insert_owner_or_admin" ON public.instagram_automation_rules;
CREATE POLICY "instagram_automation_rules_insert_owner_or_admin"
ON public.instagram_automation_rules FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_rules_update_owner_or_admin" ON public.instagram_automation_rules;
CREATE POLICY "instagram_automation_rules_update_owner_or_admin"
ON public.instagram_automation_rules FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_automation_rules_delete_owner_or_admin" ON public.instagram_automation_rules;
CREATE POLICY "instagram_automation_rules_delete_owner_or_admin"
ON public.instagram_automation_rules FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_webhook_events_read_owner_or_admin" ON public.instagram_webhook_events;
CREATE POLICY "instagram_webhook_events_read_owner_or_admin"
ON public.instagram_webhook_events FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_webhook_events_insert_owner_or_admin" ON public.instagram_webhook_events;
CREATE POLICY "instagram_webhook_events_insert_owner_or_admin"
ON public.instagram_webhook_events FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_webhook_events_update_owner_or_admin" ON public.instagram_webhook_events;
CREATE POLICY "instagram_webhook_events_update_owner_or_admin"
ON public.instagram_webhook_events FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "instagram_webhook_events_delete_owner_or_admin" ON public.instagram_webhook_events;
CREATE POLICY "instagram_webhook_events_delete_owner_or_admin"
ON public.instagram_webhook_events FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());
