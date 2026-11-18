-- Publicly readable CLT devotional artwork. Uploads are restricted to HBG staff.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clt-devotionals', 'clt-devotionals', true, 15000000, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "CLT staff upload" ON storage.objects;
CREATE POLICY "CLT staff upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clt-devotionals' AND public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));

DROP POLICY IF EXISTS "CLT staff update" ON storage.objects;
CREATE POLICY "CLT staff update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clt-devotionals' AND public.hbg_has_staff_role(ARRAY['owner','pastor','manager']))
WITH CHECK (bucket_id = 'clt-devotionals' AND public.hbg_has_staff_role(ARRAY['owner','pastor','manager']));

DROP POLICY IF EXISTS "CLT staff delete" ON storage.objects;
CREATE POLICY "CLT staff delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'clt-devotionals' AND public.hbg_has_staff_role(ARRAY['owner','pastor']));
