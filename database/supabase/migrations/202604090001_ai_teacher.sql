-- Student Society: AI Teacher chats, saved library, file chunk cache, and coin pricing

CREATE TABLE IF NOT EXISTS public.ai_teacher_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'AI Teacher Chat',
  summary_text TEXT,
  last_tool_type TEXT,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  CHECK (
    last_tool_type IS NULL OR last_tool_type IN (
      'ask_question',
      'notes',
      'summary',
      'quiz',
      'mindmap',
      'image_solver',
      'practical_use'
    )
  )
);

DROP TRIGGER IF EXISTS ai_teacher_chats_set_updated_at ON public.ai_teacher_chats;
CREATE TRIGGER ai_teacher_chats_set_updated_at
BEFORE UPDATE ON public.ai_teacher_chats
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_teacher_chats_owner_updated_at
  ON public.ai_teacher_chats(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_teacher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.ai_teacher_chats(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
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
  input_text TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content) = 'object'),
  file_url TEXT,
  graph_url TEXT,
  api_mode TEXT NOT NULL DEFAULT 'admin_api' CHECK (api_mode IN ('admin_api', 'user_api')),
  provider_name TEXT,
  coin_cost INTEGER NOT NULL DEFAULT 0 CHECK (coin_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_teacher_messages_chat_created_at
  ON public.ai_teacher_messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_messages_owner_created_at
  ON public.ai_teacher_messages(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_teacher_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_theme TEXT NOT NULL DEFAULT 'yellow' CHECK (color_theme IN ('yellow', 'blue', 'pink', 'green')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(name)) BETWEEN 1 AND 120)
);

DROP TRIGGER IF EXISTS ai_teacher_folders_set_updated_at ON public.ai_teacher_folders;
CREATE TRIGGER ai_teacher_folders_set_updated_at
BEFORE UPDATE ON public.ai_teacher_folders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_teacher_folders_owner_updated_at
  ON public.ai_teacher_folders(owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_teacher_saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.ai_teacher_folders(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.ai_teacher_chats(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ai_teacher_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
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
  preview_text TEXT,
  structured_content JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(structured_content) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 160)
);

DROP TRIGGER IF EXISTS ai_teacher_saved_items_set_updated_at ON public.ai_teacher_saved_items;
CREATE TRIGGER ai_teacher_saved_items_set_updated_at
BEFORE UPDATE ON public.ai_teacher_saved_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_teacher_saved_items_owner_created_at
  ON public.ai_teacher_saved_items(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_teacher_saved_items_folder_created_at
  ON public.ai_teacher_saved_items(folder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_teacher_file_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_hash TEXT NOT NULL CHECK (char_length(source_hash) = 64),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('pdf', 'image', 'text')),
  mime_type TEXT NOT NULL,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  chunk_text TEXT NOT NULL,
  embedding JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(embedding) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (owner_id, source_hash, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_teacher_file_chunks_owner_source_hash
  ON public.ai_teacher_file_chunks(owner_id, source_hash, chunk_index);

INSERT INTO public.coin_feature_settings (
  feature_key,
  feature_name,
  description,
  category,
  billing_model,
  coins_required,
  access_key,
  duration_days,
  is_enabled,
  sort_order
)
VALUES
  (
    'ai_teacher_admin_generate',
    'AI Teacher Generate (Admin API)',
    'Charge coins for AI Teacher generations that use the platform-managed API.',
    'ai',
    'per_use',
    6,
    NULL,
    NULL,
    TRUE,
    80
  ),
  (
    'ai_teacher_user_generate',
    'AI Teacher Generate (User API)',
    'Charge fewer coins when AI Teacher uses a user-supplied router key.',
    'ai',
    'per_use',
    2,
    NULL,
    NULL,
    TRUE,
    81
  )
ON CONFLICT (feature_key) DO UPDATE
SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  billing_model = EXCLUDED.billing_model,
  coins_required = EXCLUDED.coins_required,
  is_enabled = EXCLUDED.is_enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = timezone('utc', now());

ALTER TABLE public.ai_teacher_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_file_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_teacher_chats_read_self" ON public.ai_teacher_chats;
CREATE POLICY "ai_teacher_chats_read_self"
ON public.ai_teacher_chats FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_chats_write_self" ON public.ai_teacher_chats;
CREATE POLICY "ai_teacher_chats_write_self"
ON public.ai_teacher_chats FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_messages_read_self" ON public.ai_teacher_messages;
CREATE POLICY "ai_teacher_messages_read_self"
ON public.ai_teacher_messages FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_messages_write_self" ON public.ai_teacher_messages;
CREATE POLICY "ai_teacher_messages_write_self"
ON public.ai_teacher_messages FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_folders_read_self" ON public.ai_teacher_folders;
CREATE POLICY "ai_teacher_folders_read_self"
ON public.ai_teacher_folders FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_folders_write_self" ON public.ai_teacher_folders;
CREATE POLICY "ai_teacher_folders_write_self"
ON public.ai_teacher_folders FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_saved_items_read_self" ON public.ai_teacher_saved_items;
CREATE POLICY "ai_teacher_saved_items_read_self"
ON public.ai_teacher_saved_items FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_saved_items_write_self" ON public.ai_teacher_saved_items;
CREATE POLICY "ai_teacher_saved_items_write_self"
ON public.ai_teacher_saved_items FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_file_chunks_read_self" ON public.ai_teacher_file_chunks;
CREATE POLICY "ai_teacher_file_chunks_read_self"
ON public.ai_teacher_file_chunks FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "ai_teacher_file_chunks_write_self" ON public.ai_teacher_file_chunks;
CREATE POLICY "ai_teacher_file_chunks_write_self"
ON public.ai_teacher_file_chunks FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
