CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  installation_id TEXT NOT NULL UNIQUE,
  device_label TEXT NOT NULL,
  platform TEXT NOT NULL,
  push_token TEXT NOT NULL UNIQUE,
  app_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_devices_user_id_active
ON public.push_devices(user_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_devices_push_token_active
ON public.push_devices(push_token, is_active, updated_at DESC);

DROP TRIGGER IF EXISTS push_devices_set_updated_at ON public.push_devices;
CREATE TRIGGER push_devices_set_updated_at
BEFORE UPDATE ON public.push_devices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_devices_read_self_or_admin" ON public.push_devices;
CREATE POLICY "push_devices_read_self_or_admin"
ON public.push_devices FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "push_devices_insert_self_or_admin" ON public.push_devices;
CREATE POLICY "push_devices_insert_self_or_admin"
ON public.push_devices FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "push_devices_update_self_or_admin" ON public.push_devices;
CREATE POLICY "push_devices_update_self_or_admin"
ON public.push_devices FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "push_devices_delete_self_or_admin" ON public.push_devices;
CREATE POLICY "push_devices_delete_self_or_admin"
ON public.push_devices FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());
