-- Student Society: AI Teacher multi-provider registry, custom adapters, and Ollama routing

CREATE TABLE IF NOT EXISTS public.ai_teacher_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('litellm', 'workers_ai', 'mimo', 'ollama')),
  label TEXT NOT NULL,
  adapter_kind TEXT NOT NULL CHECK (adapter_kind IN ('litellm', 'workers_ai', 'mimo', 'ollama')),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('default', 'custom', 'local')),
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  supports_text BOOLEAN NOT NULL DEFAULT TRUE,
  supports_vision BOOLEAN NOT NULL DEFAULT FALSE,
  supports_model_management BOOLEAN NOT NULL DEFAULT FALSE,
  requires_api_key BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(label)) BETWEEN 1 AND 120)
);

DROP TRIGGER IF EXISTS ai_teacher_providers_set_updated_at ON public.ai_teacher_providers;
CREATE TRIGGER ai_teacher_providers_set_updated_at
BEFORE UPDATE ON public.ai_teacher_providers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_teacher_providers (
  slug,
  label,
  adapter_kind,
  provider_type,
  description,
  is_enabled,
  supports_text,
  supports_vision,
  supports_model_management,
  requires_api_key,
  config
) VALUES
  (
    'litellm',
    'LiteLLM',
    'litellm',
    'default',
    'Default adapter for OpenAI, Gemini, Anthropic, Groq, DeepSeek, and other LiteLLM-compatible providers.',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    '{}'::jsonb
  ),
  (
    'workers_ai',
    'Workers AI',
    'workers_ai',
    'custom',
    'Cloudflare Workers AI adapter with account-level routing and direct Cloudflare API calls.',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    '{"api_base":"https://api.cloudflare.com","account_id":"","input_cost_per_1k_tokens":0,"output_cost_per_1k_tokens":0}'::jsonb
  ),
  (
    'mimo',
    'MiMo-V2-Omni',
    'mimo',
    'custom',
    'Custom multimodal provider adapter. Uses the admin-configured base URL and endpoint for requests.',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    '{"api_base":"","chat_endpoint":"/v1/chat/completions","request_format":"openai_chat","auth_header_name":"Authorization","auth_scheme":"Bearer","input_cost_per_1k_tokens":0,"output_cost_per_1k_tokens":0}'::jsonb
  ),
  (
    'ollama',
    'Ollama',
    'ollama',
    'local',
    'Local or self-hosted Ollama server with model install and delete support.',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    '{"api_base":"http://localhost:11434","keep_alive":"5m","input_cost_per_1k_tokens":0,"output_cost_per_1k_tokens":0}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET
  label = EXCLUDED.label,
  adapter_kind = EXCLUDED.adapter_kind,
  provider_type = EXCLUDED.provider_type,
  description = EXCLUDED.description,
  supports_text = EXCLUDED.supports_text,
  supports_vision = EXCLUDED.supports_vision,
  supports_model_management = EXCLUDED.supports_model_management,
  requires_api_key = EXCLUDED.requires_api_key,
  config = CASE
    WHEN public.ai_teacher_providers.config = '{}'::jsonb THEN EXCLUDED.config
    ELSE public.ai_teacher_providers.config
  END;

ALTER TABLE public.ai_teacher_provider_keys
  ADD COLUMN IF NOT EXISTS provider_slug TEXT,
  ADD COLUMN IF NOT EXISTS adapter_kind TEXT;

UPDATE public.ai_teacher_provider_keys
SET
  provider_slug = CASE
    WHEN lower(provider) IN ('workers_ai', 'cloudflare', 'cloudflare_workers_ai') THEN 'workers_ai'
    WHEN lower(provider) IN ('mimo', 'mimo_v2_omni', 'mimo-v2-omni') THEN 'mimo'
    WHEN lower(provider) = 'ollama' THEN 'ollama'
    ELSE 'litellm'
  END
WHERE COALESCE(btrim(provider_slug), '') = '';

UPDATE public.ai_teacher_provider_keys
SET adapter_kind = provider_slug
WHERE COALESCE(btrim(adapter_kind), '') = '';

ALTER TABLE public.ai_teacher_provider_keys
  ALTER COLUMN provider_slug SET DEFAULT 'litellm',
  ALTER COLUMN adapter_kind SET DEFAULT 'litellm';

UPDATE public.ai_teacher_provider_keys
SET
  provider_slug = COALESCE(NULLIF(btrim(provider_slug), ''), 'litellm'),
  adapter_kind = COALESCE(NULLIF(btrim(adapter_kind), ''), 'litellm');

ALTER TABLE public.ai_teacher_provider_keys
  ALTER COLUMN provider_slug SET NOT NULL,
  ALTER COLUMN adapter_kind SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_teacher_provider_keys_provider_slug_fkey'
  ) THEN
    ALTER TABLE public.ai_teacher_provider_keys
      ADD CONSTRAINT ai_teacher_provider_keys_provider_slug_fkey
      FOREIGN KEY (provider_slug) REFERENCES public.ai_teacher_providers(slug)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_teacher_provider_keys_provider_slug
  ON public.ai_teacher_provider_keys(provider_slug, owner_scope, is_active, updated_at DESC);

ALTER TABLE public.ai_teacher_model_routes
  ALTER COLUMN provider_key_id DROP NOT NULL;

ALTER TABLE public.ai_teacher_model_routes
  ADD COLUMN IF NOT EXISTS provider_slug TEXT,
  ADD COLUMN IF NOT EXISTS adapter_kind TEXT,
  ADD COLUMN IF NOT EXISTS route_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_to_litellm BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.ai_teacher_model_routes
SET
  provider_slug = CASE
    WHEN lower(provider) IN ('workers_ai', 'cloudflare', 'cloudflare_workers_ai') THEN 'workers_ai'
    WHEN lower(provider) IN ('mimo', 'mimo_v2_omni', 'mimo-v2-omni') THEN 'mimo'
    WHEN lower(provider) = 'ollama' THEN 'ollama'
    ELSE 'litellm'
  END
WHERE COALESCE(btrim(provider_slug), '') = '';

UPDATE public.ai_teacher_model_routes
SET adapter_kind = provider_slug
WHERE COALESCE(btrim(adapter_kind), '') = '';

ALTER TABLE public.ai_teacher_model_routes
  ALTER COLUMN provider_slug SET DEFAULT 'litellm',
  ALTER COLUMN adapter_kind SET DEFAULT 'litellm';

UPDATE public.ai_teacher_model_routes
SET
  provider_slug = COALESCE(NULLIF(btrim(provider_slug), ''), 'litellm'),
  adapter_kind = COALESCE(NULLIF(btrim(adapter_kind), ''), 'litellm'),
  route_config = COALESCE(route_config, '{}'::jsonb);

ALTER TABLE public.ai_teacher_model_routes
  ALTER COLUMN provider_slug SET NOT NULL,
  ALTER COLUMN adapter_kind SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_teacher_model_routes_provider_slug_fkey'
  ) THEN
    ALTER TABLE public.ai_teacher_model_routes
      ADD CONSTRAINT ai_teacher_model_routes_provider_slug_fkey
      FOREIGN KEY (provider_slug) REFERENCES public.ai_teacher_providers(slug)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_teacher_model_routes_provider_slug
  ON public.ai_teacher_model_routes(provider_slug, tool_type, priority, is_enabled, sort_order ASC);

ALTER TABLE public.ai_teacher_usage_logs
  ADD COLUMN IF NOT EXISTS provider_slug TEXT,
  ADD COLUMN IF NOT EXISTS adapter_kind TEXT,
  ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.ai_teacher_usage_logs
SET
  provider_slug = CASE
    WHEN lower(COALESCE(provider, '')) IN ('workers_ai', 'cloudflare', 'cloudflare_workers_ai') THEN 'workers_ai'
    WHEN lower(COALESCE(provider, '')) IN ('mimo', 'mimo_v2_omni', 'mimo-v2-omni') THEN 'mimo'
    WHEN lower(COALESCE(provider, '')) = 'ollama' THEN 'ollama'
    WHEN COALESCE(provider, '') = '' THEN NULL
    ELSE 'litellm'
  END
WHERE provider_slug IS NULL;

UPDATE public.ai_teacher_usage_logs
SET adapter_kind = provider_slug
WHERE adapter_kind IS NULL AND provider_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_teacher_usage_logs_provider_slug
  ON public.ai_teacher_usage_logs(provider_slug, created_at DESC);

ALTER TABLE public.ai_teacher_providers ENABLE ROW LEVEL SECURITY;
