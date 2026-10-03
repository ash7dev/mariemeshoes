-- =============================================================================
--  MARIEMESHOES — Galerie, version simple
--
--  Le formulaire ne demande ni prénom, ni ville, ni pointure : une photo, sa paire,
--  une légende facultative. Les colonnes (et leurs CHECK) disparaissent avec elles.
-- =============================================================================

-- @allow-drop gallery_posts_author_chk
-- @allow-drop gallery_posts_city_chk
-- @allow-drop gallery_posts_size_eu_chk
ALTER TABLE "gallery_posts"
  DROP COLUMN "author_name",
  DROP COLUMN "city",
  DROP COLUMN "size_eu";
