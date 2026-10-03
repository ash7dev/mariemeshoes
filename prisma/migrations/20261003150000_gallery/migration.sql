-- @protected
-- =============================================================================
--  MARIEMESHOES — Galerie
--
--  Une photo = une paire (coloris) existante : le client s'inspire, puis va
--  directement à la paire. Photos d'ambiance dans le bucket « products », dossier
--  « gallery/ ». Une photo n'est publiée qu'avec l'accord de la personne (CHECK).
--  Paire supprimée → ses photos de galerie aussi (CASCADE).
-- =============================================================================

CREATE TABLE "gallery_posts" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "colorway_id"  uuid NOT NULL,
  "image_path"   text NOT NULL,
  "width"        integer,
  "height"       integer,
  "caption"      text,
  "author_name"  text,
  "city"         text,
  "size_eu"      integer,
  "consent"      boolean NOT NULL DEFAULT false,
  "is_published" boolean NOT NULL DEFAULT false,
  "published_at" timestamptz(3),
  "created_at"   timestamptz(3) NOT NULL DEFAULT now(),
  "updated_at"   timestamptz(3) NOT NULL DEFAULT now(),

  CONSTRAINT "gallery_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gallery_posts_colorway_id_fkey" FOREIGN KEY ("colorway_id") REFERENCES "colorways" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "gallery_posts_image_path_chk" CHECK ("image_path" ~ '^gallery/[0-9]{4}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'),
  CONSTRAINT "gallery_posts_width_chk" CHECK ("width" IS NULL OR "width" > 0),
  CONSTRAINT "gallery_posts_height_chk" CHECK ("height" IS NULL OR "height" > 0),
  CONSTRAINT "gallery_posts_caption_chk" CHECK ("caption" IS NULL OR char_length("caption") BETWEEN 1 AND 160),
  CONSTRAINT "gallery_posts_author_chk" CHECK ("author_name" IS NULL OR char_length("author_name") BETWEEN 1 AND 40),
  CONSTRAINT "gallery_posts_city_chk" CHECK ("city" IS NULL OR char_length("city") BETWEEN 1 AND 40),
  CONSTRAINT "gallery_posts_size_eu_chk" CHECK ("size_eu" IS NULL OR "size_eu" BETWEEN 16 AND 46),
  CONSTRAINT "gallery_posts_consent_chk" CHECK (NOT "is_published" OR "consent"),
  CONSTRAINT "gallery_posts_published_at_chk" CHECK (NOT "is_published" OR "published_at" IS NOT NULL)
);

CREATE INDEX "gallery_posts_published_idx" ON "gallery_posts" ("is_published", "published_at" DESC);
CREATE INDEX "gallery_posts_colorway_idx" ON "gallery_posts" ("colorway_id");

-- -----------------------------------------------------------------------------
--  SÉCURITÉ SUPABASE (comme les autres tables : lue et écrite par le serveur seul)
-- -----------------------------------------------------------------------------

ALTER TABLE "gallery_posts" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format('REVOKE ALL ON "gallery_posts" FROM %I', v_role);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
--  STOCKAGE : les admins actifs peuvent aussi envoyer sous « gallery/ »
-- -----------------------------------------------------------------------------

DO $migration$
BEGIN
  IF to_regclass('storage.objects') IS NULL OR to_regprocedure('public.is_active_admin()') IS NULL THEN
    RAISE NOTICE 'Supabase Storage absent : règle d''envoi inchangée';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "products_admin_insert" ON storage.objects;
  CREATE POLICY "products_admin_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'products' AND (storage.foldername(name))[1] IN ('colorways', 'gallery') AND public.is_active_admin());
END
$migration$;
