-- Générations : chaque utilisateur gère uniquement son dossier
CREATE POLICY "gen own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generations' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "gen own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generations' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "gen own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'generations' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Pièces jointes support : propriétaire + staff support
CREATE POLICY "support att read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'support_operator'::app_role)
  ));
CREATE POLICY "support att insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(),'super_admin'::app_role)
    OR has_role(auth.uid(),'support_operator'::app_role)
  ));