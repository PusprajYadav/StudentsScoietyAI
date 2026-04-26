-- Student Society: track post edit timestamps separately from generic row updates

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
