-- Student Society: storage buckets for profile and post media

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-media', 'profile-media', TRUE),
  ('post-media', 'post-media', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read"
ON storage.objects FOR SELECT
USING (bucket_id IN ('profile-media', 'post-media'));

DROP POLICY IF EXISTS "storage_insert_profile_media" ON storage.objects;
CREATE POLICY "storage_insert_profile_media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_insert_post_media" ON storage.objects;
CREATE POLICY "storage_insert_post_media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_update_own_media" ON storage.objects;
CREATE POLICY "storage_update_own_media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('profile-media', 'post-media')
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('profile-media', 'post-media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_delete_own_media" ON storage.objects;
CREATE POLICY "storage_delete_own_media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('profile-media', 'post-media')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_admin_manage_all" ON storage.objects;
CREATE POLICY "storage_admin_manage_all"
ON storage.objects FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

