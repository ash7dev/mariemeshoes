-- =============================================================================
--  MARIEMESHOES — Galerie : plus de case « accord de la personne »
--
--  Décision de la boutique : la case est retirée du formulaire ; la publication
--  ne dépend plus que de « En ligne ». La colonne et sa règle disparaissent.
-- =============================================================================

-- @allow-drop gallery_posts_consent_chk
ALTER TABLE "gallery_posts" DROP CONSTRAINT "gallery_posts_consent_chk";
ALTER TABLE "gallery_posts" DROP COLUMN "consent";
