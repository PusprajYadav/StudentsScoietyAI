-- Student Society: AI Teacher unified chat metadata for persistent source context

ALTER TABLE public.ai_teacher_chats
  ADD COLUMN IF NOT EXISTS source_file_url TEXT,
  ADD COLUMN IF NOT EXISTS source_file_name TEXT,
  ADD COLUMN IF NOT EXISTS source_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS source_hash TEXT,
  ADD COLUMN IF NOT EXISTS source_context_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_teacher_chats_owner_source_hash
  ON public.ai_teacher_chats(owner_id, source_hash);

UPDATE public.ai_teacher_chats AS chat
SET source_file_url = recent.file_url
FROM (
  SELECT DISTINCT ON (message.chat_id)
    message.chat_id,
    message.file_url
  FROM public.ai_teacher_messages AS message
  WHERE message.file_url IS NOT NULL
  ORDER BY message.chat_id, message.created_at DESC
) AS recent
WHERE chat.id = recent.chat_id
  AND chat.source_file_url IS NULL;
