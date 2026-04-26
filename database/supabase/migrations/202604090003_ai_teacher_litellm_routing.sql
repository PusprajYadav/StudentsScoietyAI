-- Student Society: AI Teacher LiteLLM provider keys, model routes, and usage logs

CREATE TABLE IF NOT EXISTS public.ai_teacher_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_scope TEXT NOT NULL CHECK (owner_scope IN ('platform', 'user')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  provider TEXT NOT NULL,
  default_model_name TEXT,
  api_base TEXT,
  api_version TEXT,
  key_hint_last4 TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_key_iv TEXT NOT NULL,
  extra_headers JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(extra_headers) = 'object'),
  extra_config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(extra_config) = 'object'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(provider)) BETWEEN 1 AND 80),
  CHECK (
    (owner_scope = 'platform' AND owner_id IS NULL)
    OR (owner_scope = 'user' AND owner_id IS NOT NULL)
  )
);

DROP TRIGGER IF EXISTS ai_teacher_provider_keys_set_updated_at ON public.ai_teacher_provider_keys;
CREATE TRIGGER ai_teacher_provider_keys_set_updated_at
BEFORE UPDATE ON public.ai_teacher_provider_keys
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_teacher_provider_keys_scope_provider
  ON public.ai_teacher_provider_keys(owner_scope, provider, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_provider_keys_owner_updated_at
  ON public.ai_teacher_provider_keys(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_teacher_model_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key_id UUID NOT NULL REFERENCES public.ai_teacher_provider_keys(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL CHECK (
    tool_type IN (
      'default',
      'ask_question',
      'notes',
      'summary',
      'quiz',
      'mindmap',
      'image_solver',
      'practical_use'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'balanced' CHECK (priority IN ('cheap', 'fast', 'balanced', 'best')),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.20 CHECK (temperature >= 0 AND temperature <= 2),
  max_output_tokens INTEGER CHECK (max_output_tokens IS NULL OR max_output_tokens > 0),
  sort_order INTEGER NOT NULL DEFAULT 100,
  supports_vision BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  CHECK (char_length(btrim(provider)) BETWEEN 1 AND 80),
  CHECK (char_length(btrim(model_name)) BETWEEN 1 AND 240)
);

DROP TRIGGER IF EXISTS ai_teacher_model_routes_set_updated_at ON public.ai_teacher_model_routes;
CREATE TRIGGER ai_teacher_model_routes_set_updated_at
BEFORE UPDATE ON public.ai_teacher_model_routes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_teacher_model_routes_tool_priority_enabled
  ON public.ai_teacher_model_routes(tool_type, priority, is_enabled, sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_model_routes_provider_key
  ON public.ai_teacher_model_routes(provider_key_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_teacher_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.ai_teacher_chats(id) ON DELETE SET NULL,
  user_message_id UUID REFERENCES public.ai_teacher_messages(id) ON DELETE SET NULL,
  assistant_message_id UUID REFERENCES public.ai_teacher_messages(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.ai_teacher_model_routes(id) ON DELETE SET NULL,
  provider TEXT,
  model_name TEXT,
  tool_type TEXT NOT NULL CHECK (
    tool_type IN (
      'ask_question',
      'notes',
      'summary',
      'quiz',
      'mindmap',
      'image_solver',
      'practical_use'
    )
  ),
  api_mode TEXT NOT NULL CHECK (api_mode IN ('admin_api', 'user_api')),
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  total_cost_usd NUMERIC(14,8) NOT NULL DEFAULT 0 CHECK (total_cost_usd >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_teacher_usage_logs_owner_created_at
  ON public.ai_teacher_usage_logs(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_usage_logs_chat_created_at
  ON public.ai_teacher_usage_logs(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_usage_logs_route_created_at
  ON public.ai_teacher_usage_logs(route_id, created_at DESC);

ALTER TABLE public.ai_teacher_messages
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_key_label TEXT,
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.ai_teacher_model_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS usage_log_id UUID REFERENCES public.ai_teacher_usage_logs(id) ON DELETE SET NULL;

ALTER TABLE public.ai_teacher_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_model_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_usage_logs ENABLE ROW LEVEL SECURITY;
