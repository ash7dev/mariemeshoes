-- @protected
-- =============================================================================
--  MARIEMESHOES — Mot de la collection
--
--  note : phrase facultative affichée sous une paire mise en avant sur la page
--  de la collection (« Le blanc qui va avec tout… »). Sans note, la page reprend
--  la première phrase de la description du produit.
-- =============================================================================

ALTER TABLE "collection_items" ADD COLUMN "note" text;

ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_note_len_chk"
  CHECK ("note" IS NULL OR char_length("note") BETWEEN 1 AND 140);
