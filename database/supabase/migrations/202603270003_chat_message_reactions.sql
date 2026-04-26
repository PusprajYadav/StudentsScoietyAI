-- Chat message reactions table
-- Stores emoji reactions on chat messages (identified by conversation_id + client_message_id)
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL,
    client_message_id text NOT NULL,
    reactor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,

    -- One reaction per user per message
    UNIQUE (conversation_id, client_message_id, reactor_id)
);

-- Index for fast lookup by conversation + message
CREATE INDEX idx_chat_reactions_conv_msg
    ON public.chat_message_reactions (conversation_id, client_message_id);

-- Index for fast lookup by reactor
CREATE INDEX idx_chat_reactions_reactor
    ON public.chat_message_reactions (reactor_id);

-- RLS policies
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can see reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
    ON public.chat_message_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.conversation_id = chat_message_reactions.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

-- Users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
    ON public.chat_message_reactions
    FOR INSERT
    WITH CHECK (reactor_id = auth.uid());

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
    ON public.chat_message_reactions
    FOR UPDATE
    USING (reactor_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
    ON public.chat_message_reactions
    FOR DELETE
    USING (reactor_id = auth.uid());

-- Service role bypass for backend maintenance jobs
CREATE POLICY "Service role full access to reactions"
    ON public.chat_message_reactions
    FOR ALL
    USING (auth.role() = 'service_role');
