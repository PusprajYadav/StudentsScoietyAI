-- Student Society: tighten chat retention to 7 days and support ephemeral cleanup.

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.chat_conversations
SET expires_at = COALESCE(last_server_activity_at, created_at) + interval '7 days'
WHERE expires_at IS NULL;

ALTER TABLE public.chat_conversations
  ALTER COLUMN expires_at SET DEFAULT (timezone('utc', now()) + interval '7 days');

ALTER TABLE public.chat_conversations
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_expires_at
ON public.chat_conversations(expires_at);

ALTER TABLE public.chat_requests
  ALTER COLUMN expires_at SET DEFAULT (timezone('utc', now()) + interval '7 days');

UPDATE public.chat_requests
SET expires_at = COALESCE(responded_at, created_at) + interval '7 days'
WHERE expires_at IS NULL
   OR expires_at > COALESCE(responded_at, created_at) + interval '7 days';

ALTER TABLE public.chat_delivery_receipts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.chat_delivery_receipts
SET expires_at = delivered_at + interval '7 days'
WHERE expires_at IS NULL;

ALTER TABLE public.chat_delivery_receipts
  ALTER COLUMN expires_at SET DEFAULT (timezone('utc', now()) + interval '7 days');

ALTER TABLE public.chat_delivery_receipts
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_delivery_receipts_expires_at
ON public.chat_delivery_receipts(expires_at);

CREATE OR REPLACE FUNCTION public.touch_chat_conversation_from_envelope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.chat_conversations
    SET last_server_activity_at = NEW.sent_at,
        expires_at = NEW.sent_at + interval '7 days',
        updated_at = timezone('utc', now())
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;
