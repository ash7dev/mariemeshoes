-- @protected
-- =============================================================================
--  MARIEMESHOES — Stockage des photos de coloris (Supabase Storage)
--
--  - Bucket « products » PUBLIC en lecture (catalogue visible par tous, via CDN),
--    limité à 5 Mo par fichier et aux formats WebP / JPEG / PNG.
--  - Écriture, suppression et listing réservés aux admins ACTIFS, vérifiés par
--    Supabase lui-même (RLS sur storage.objects), pas seulement par l'application.
--  - Les fichiers vivent sous « colorways/ » : aucun autre dossier n'est accepté.
--
--  Sans Supabase (shadow database, base de test hors Supabase) : ignorée proprement.
-- =============================================================================

DO $migration$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'Supabase Storage absent : bucket et règles non créés';
    RETURN;
  END IF;

  -- Admin actif ? SECURITY DEFINER : lit admin_profiles, fermée à l'API publique.
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.is_active_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
    AS $body$
      SELECT EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid() AND is_active);
    $body$
  $fn$;
  REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('products', 'products', true, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png'])
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "products_admin_select" ON storage.objects;
  DROP POLICY IF EXISTS "products_admin_insert" ON storage.objects;
  DROP POLICY IF EXISTS "products_admin_delete" ON storage.objects;

  CREATE POLICY "products_admin_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'products' AND public.is_active_admin());

  CREATE POLICY "products_admin_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'products' AND (storage.foldername(name))[1] = 'colorways' AND public.is_active_admin());

  CREATE POLICY "products_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'products' AND public.is_active_admin());
END
$migration$;
