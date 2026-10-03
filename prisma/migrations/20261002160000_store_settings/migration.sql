-- @protected
-- =============================================================================
--  MARIEMESHOES — Paramètres de la boutique
--
--  store_settings : UNE seule ligne (id = 1), modifiable depuis l'admin
--  (Paramètres). Remplace les variables d'environnement WhatsApp / réseaux,
--  qui restent une valeur de secours tant que la ligne n'est pas remplie.
--
--  delivery_zones : délai de livraison affiché au client (« 24 h », « 48–72 h »).
-- =============================================================================

CREATE TABLE "store_settings" (
  "id"                 integer        NOT NULL DEFAULT 1,
  "store_name"         text           NOT NULL DEFAULT 'Mariemeshoes',
  "whatsapp_number"    text,
  "contact_phone"      text,
  "contact_email"      text,
  "instagram_url"      text,
  "tiktok_url"         text,
  "wave_merchant_code" text,
  "wave_payment_link"  text,
  "updated_at"         timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_settings_singleton_chk" CHECK ("id" = 1),
  CONSTRAINT "store_settings_name_chk" CHECK (btrim("store_name") <> '' AND length("store_name") <= 80),
  CONSTRAINT "store_settings_phones_chk" CHECK (
    ("whatsapp_number" IS NULL OR "whatsapp_number" ~ '^\+[1-9][0-9]{7,14}$') AND
    ("contact_phone"   IS NULL OR "contact_phone"   ~ '^\+[1-9][0-9]{7,14}$')
  ),
  CONSTRAINT "store_settings_email_chk" CHECK ("contact_email" IS NULL OR "contact_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT "store_settings_urls_chk" CHECK (
    ("instagram_url"     IS NULL OR "instagram_url"     ~ '^https://(www\.)?instagram\.com/') AND
    ("tiktok_url"        IS NULL OR "tiktok_url"        ~ '^https://(www\.)?tiktok\.com/') AND
    ("wave_payment_link" IS NULL OR "wave_payment_link" ~ '^https://pay\.wave\.com/')
  ),
  CONSTRAINT "store_settings_wave_code_chk" CHECK ("wave_merchant_code" IS NULL OR "wave_merchant_code" ~ '^[A-Za-z0-9_-]{2,40}$')
);

INSERT INTO "store_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;

CREATE TRIGGER "store_settings_set_updated_at"
  BEFORE UPDATE ON "store_settings"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE "delivery_zones"
  ADD COLUMN "estimated_delay" text,
  ADD CONSTRAINT "delivery_zones_name_chk" CHECK (btrim("name") <> '' AND length("name") <= 80),
  ADD CONSTRAINT "delivery_zones_delay_chk" CHECK ("estimated_delay" IS NULL OR length("estimated_delay") <= 40);

-- -----------------------------------------------------------------------------
--  SÉCURITÉ SUPABASE
-- -----------------------------------------------------------------------------

ALTER TABLE "store_settings" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format('REVOKE ALL ON "store_settings" FROM %I', v_role);
    END IF;
  END LOOP;
END $$;
