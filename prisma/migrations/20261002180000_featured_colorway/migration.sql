-- @protected
-- =============================================================================
--  MARIEMESHOES — Coup de cœur de la semaine
--
--  featured_until : le coloris est mis en avant en tête de la boutique jusqu'à
--  cette date. Un seul coloris à la fois (index unique partiel) : l'admin retire
--  l'ancien avant de poser le nouveau, dans la même transaction.
-- =============================================================================

ALTER TABLE "colorways" ADD COLUMN "featured_until" timestamptz(3);

CREATE UNIQUE INDEX "colorways_single_featured_idx" ON "colorways" ((true)) WHERE "featured_until" IS NOT NULL;
