-- Student Society: post mentions and per-type native push notification preferences

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'follow',
      'post_like',
      'post_comment',
      'comment_reply',
      'profile_view',
      'post_mention',
      'chat_request',
      'chat_message'
    )
  );

CREATE TABLE IF NOT EXISTS public.notification_push_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enable_follow_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_post_like_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_post_comment_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_comment_reply_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_profile_view_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_post_mention_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_chat_request_push BOOLEAN NOT NULL DEFAULT TRUE,
  enable_chat_message_push BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS notification_push_preferences_set_updated_at ON public.notification_push_preferences;
CREATE TRIGGER notification_push_preferences_set_updated_at
BEFORE UPDATE ON public.notification_push_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_default_notification_push_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.notification_push_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_create_default_notification_push_preferences ON public.profiles;
CREATE TRIGGER profiles_create_default_notification_push_preferences
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_push_preferences();

INSERT INTO public.notification_push_preferences (user_id)
SELECT p.id
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.notification_push_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_push_preferences_read_self_or_admin" ON public.notification_push_preferences;
CREATE POLICY "notification_push_preferences_read_self_or_admin"
ON public.notification_push_preferences FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notification_push_preferences_insert_self_or_admin" ON public.notification_push_preferences;
CREATE POLICY "notification_push_preferences_insert_self_or_admin"
ON public.notification_push_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notification_push_preferences_update_self_or_admin" ON public.notification_push_preferences;
CREATE POLICY "notification_push_preferences_update_self_or_admin"
ON public.notification_push_preferences FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notification_push_preferences_delete_admin_only" ON public.notification_push_preferences;
CREATE POLICY "notification_push_preferences_delete_admin_only"
ON public.notification_push_preferences FOR DELETE
USING (public.is_admin());
