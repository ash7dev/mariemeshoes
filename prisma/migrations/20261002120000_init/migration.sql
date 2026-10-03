-- @protected
-- =============================================================================
--  MARIEMESHOES — Schéma PostgreSQL complet
--  PostgreSQL 15+
--
--  Aligné sur schema.prisma (mêmes noms de tables, colonnes, contraintes et
--  index, selon les conventions de nommage Prisma) + ce que Prisma ne sait pas
--  exprimer :
--    - contraintes CHECK (montants, stock, dates, téléphone)
--    - index partiels (catalogue actif, pointures en stock, accueil…)
--    - triggers (updated_at, stock total par coloris)
--    - génération de la référence de commande (MS-2610-00001)
--    - fonctions métier de réservation / libération / expiration du stock
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
--  EXTENSIONS
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- recherche floue (noms, coloris, marques)

-- -----------------------------------------------------------------------------
--  ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE "gender"                AS ENUM ('MEN', 'WOMEN', 'UNISEX', 'KIDS');
CREATE TYPE "order_status"          AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');
CREATE TYPE "payment_method"        AS ENUM ('WAVE', 'CASH_ON_DELIVERY');
CREATE TYPE "payment_status"        AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "stock_movement_reason" AS ENUM ('ORDER', 'CANCELLATION', 'RESTOCK', 'ADJUSTMENT', 'RETURN');
CREATE TYPE "collection_type"       AS ENUM ('MANUAL', 'AUTO_BESTSELLERS');

-- -----------------------------------------------------------------------------
--  RÉFÉRENCE DE COMMANDE  →  MS-AAMM-00001 (heure de Dakar)
-- -----------------------------------------------------------------------------

CREATE SEQUENCE "order_reference_seq" START 1 INCREMENT 1 NO CYCLE;

CREATE OR REPLACE FUNCTION generate_order_reference()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'MS-'
      || to_char(now() AT TIME ZONE 'Africa/Dakar', 'YYMM')
      || '-'
      || lpad(nextval('order_reference_seq')::text, 5, '0');
$$;

-- =============================================================================
--  CATALOGUE
-- =============================================================================

CREATE TABLE "brands" (
  "id"          uuid           NOT NULL DEFAULT gen_random_uuid(),
  "name"        text           NOT NULL,
  "slug"        text           NOT NULL,
  "logo_url"    text,
  "description" text,
  "position"    integer        NOT NULL DEFAULT 0,
  "is_active"   boolean        NOT NULL DEFAULT true,
  "created_at"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "brands_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "brands_name_not_blank_chk" CHECK (btrim("name") <> ''),
  CONSTRAINT "brands_slug_format_chk"    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE "categories" (
  "id"         uuid           NOT NULL DEFAULT gen_random_uuid(),
  "name"       text           NOT NULL,
  "slug"       text           NOT NULL,
  "position"   integer        NOT NULL DEFAULT 0,
  "is_active"  boolean        NOT NULL DEFAULT true,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "categories_name_not_blank_chk" CHECK (btrim("name") <> ''),
  CONSTRAINT "categories_slug_format_chk"    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Modèle de sneaker : ne porte ni prix ni stock
CREATE TABLE "products" (
  "id"          uuid           NOT NULL DEFAULT gen_random_uuid(),
  "brand_id"    uuid           NOT NULL,
  "category_id" uuid,
  "name"        text           NOT NULL,
  "slug"        text           NOT NULL,
  "description" text,
  "size_advice" text,          -- conseil taille affiché sur la fiche : "Taille petit, prends une pointure au-dessus"
  "gender"      "gender"       NOT NULL,
  "is_active"   boolean        NOT NULL DEFAULT true,
  "created_at"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "products_name_not_blank_chk" CHECK (btrim("name") <> ''),
  CONSTRAINT "products_slug_format_chk"    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- Coloris : une page produit = un coloris. Porte le prix et les images.
CREATE TABLE "colorways" (
  "id"               uuid           NOT NULL DEFAULT gen_random_uuid(),
  "product_id"       uuid           NOT NULL,
  "name"             text           NOT NULL,
  "slug"             text           NOT NULL,
  "style_code"       text,
  "price"            integer        NOT NULL,
  "compare_at_price" integer,
  "total_stock"      integer        NOT NULL DEFAULT 0,
  "is_active"        boolean        NOT NULL DEFAULT true,
  "published_at"     timestamptz(3),
  "created_at"       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "colorways_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "colorways_name_not_blank_chk" CHECK (btrim("name") <> ''),
  CONSTRAINT "colorways_slug_format_chk"    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "colorways_price_positive_chk" CHECK ("price" > 0),
  CONSTRAINT "colorways_compare_at_price_chk"
    CHECK ("compare_at_price" IS NULL OR "compare_at_price" > "price"),
  CONSTRAINT "colorways_total_stock_chk"    CHECK ("total_stock" >= 0)
);

CREATE TABLE "colorway_images" (
  "id"          uuid           NOT NULL DEFAULT gen_random_uuid(),
  "colorway_id" uuid           NOT NULL,
  "url"         text           NOT NULL,
  "alt"         text,
  "width"       integer,
  "height"      integer,
  "position"    integer        NOT NULL DEFAULT 0,
  "created_at"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "colorway_images_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "colorway_images_dimensions_chk"
    CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0)),
  CONSTRAINT "colorway_images_position_chk" CHECK ("position" >= 0)
);

-- Pointure précise d'un coloris : porte le stock
CREATE TABLE "variants" (
  "id"             uuid           NOT NULL DEFAULT gen_random_uuid(),
  "colorway_id"    uuid           NOT NULL,
  "size_eu"        integer        NOT NULL,
  "sku"            text           NOT NULL,
  "stock"          integer        NOT NULL DEFAULT 0,
  "price_override" integer,
  "is_active"      boolean        NOT NULL DEFAULT true,
  "created_at"     timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "variants_stock_non_negative_chk" CHECK ("stock" >= 0),
  -- Pointures entières (Sénégal) : enfant 16–35, adulte 36–46
  CONSTRAINT "variants_size_eu_range_chk"      CHECK ("size_eu" BETWEEN 16 AND 46),
  CONSTRAINT "variants_price_override_chk"     CHECK ("price_override" IS NULL OR "price_override" > 0),
  CONSTRAINT "variants_sku_not_blank_chk"      CHECK (btrim("sku") <> '')
);

-- Journal d'audit des mouvements de stock
CREATE TABLE "stock_movements" (
  "id"         uuid                    NOT NULL DEFAULT gen_random_uuid(),
  "variant_id" uuid                    NOT NULL,
  "order_id"   uuid,
  "delta"      integer                 NOT NULL,
  "reason"     "stock_movement_reason" NOT NULL,
  "note"       text,
  "created_by" text,
  "created_at" timestamptz(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_delta_not_zero_chk" CHECK ("delta" <> 0),
  CONSTRAINT "stock_movements_reason_sign_chk" CHECK (
    ("reason" = 'ORDER'                         AND "delta" < 0) OR
    ("reason" IN ('CANCELLATION', 'RETURN')     AND "delta" > 0) OR
    ("reason" IN ('RESTOCK')                    AND "delta" > 0) OR
    ("reason" = 'ADJUSTMENT')
  )
);

-- =============================================================================
--  COLLECTIONS
-- =============================================================================

CREATE TABLE "collections" (
  "id"              uuid              NOT NULL DEFAULT gen_random_uuid(),
  "name"            text              NOT NULL,
  "slug"            text              NOT NULL,
  "description"     text,
  "cover_image_url" text,
  "type"            "collection_type" NOT NULL DEFAULT 'MANUAL',
  "show_on_home"    boolean           NOT NULL DEFAULT false,
  "home_position"   integer           NOT NULL DEFAULT 0,
  "starts_at"       timestamptz(3),
  "ends_at"         timestamptz(3),
  "is_active"       boolean           NOT NULL DEFAULT true,
  "created_at"      timestamptz(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      timestamptz(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "collections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collections_name_not_blank_chk" CHECK (btrim("name") <> ''),
  CONSTRAINT "collections_slug_format_chk"    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "collections_period_chk"
    CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at")
);

CREATE TABLE "collection_items" (
  "collection_id" uuid           NOT NULL,
  "colorway_id"   uuid           NOT NULL,
  "position"      integer        NOT NULL DEFAULT 0,
  "added_at"      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "collection_items_pkey" PRIMARY KEY ("collection_id", "colorway_id"),
  CONSTRAINT "collection_items_position_chk" CHECK ("position" >= 0)
);

-- =============================================================================
--  CLIENTS & LIVRAISON
-- =============================================================================

-- Client identifié par son téléphone (format E.164 : +221771234567)
CREATE TABLE "customers" (
  "id"         uuid           NOT NULL DEFAULT gen_random_uuid(),
  "full_name"  text           NOT NULL,
  "phone"      text           NOT NULL,
  "email"      text,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_full_name_not_blank_chk" CHECK (btrim("full_name") <> ''),
  CONSTRAINT "customers_phone_e164_chk"          CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT "customers_email_format_chk"
    CHECK ("email" IS NULL OR "email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TABLE "delivery_zones" (
  "id"         uuid           NOT NULL DEFAULT gen_random_uuid(),
  "name"       text           NOT NULL,
  "fee"        integer        NOT NULL,
  "position"   integer        NOT NULL DEFAULT 0,
  "is_active"  boolean        NOT NULL DEFAULT true,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_zones_fee_chk" CHECK ("fee" >= 0)
);

-- =============================================================================
--  COMMANDES & PAIEMENTS
-- =============================================================================

CREATE TABLE "orders" (
  "id"                 uuid             NOT NULL DEFAULT gen_random_uuid(),
  "reference"          text             NOT NULL DEFAULT generate_order_reference(),
  "customer_id"        uuid,
  "status"             "order_status"   NOT NULL DEFAULT 'PENDING',
  "payment_method"     "payment_method" NOT NULL,
  "payment_status"     "payment_status" NOT NULL DEFAULT 'PENDING',
  "customer_name"      text             NOT NULL,
  "customer_phone"     text             NOT NULL,
  "customer_phone_alt" text,
  "delivery_zone_id"   uuid,
  "delivery_zone_name" text,
  "delivery_address"   text             NOT NULL,
  "delivery_notes"     text,
  "subtotal"           integer          NOT NULL,
  "delivery_fee"       integer          NOT NULL,
  "discount_amount"    integer          NOT NULL DEFAULT 0,
  "total"              integer          NOT NULL,
  "cancel_reason"      text,
  "expires_at"         timestamptz(3),
  "confirmed_at"       timestamptz(3),
  "shipped_at"         timestamptz(3),
  "delivered_at"       timestamptz(3),
  "cancelled_at"       timestamptz(3),
  "created_at"         timestamptz(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         timestamptz(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_amounts_non_negative_chk"
    CHECK ("subtotal" >= 0 AND "delivery_fee" >= 0 AND "discount_amount" >= 0),
  CONSTRAINT "orders_discount_chk"      CHECK ("discount_amount" <= "subtotal"),
  CONSTRAINT "orders_total_chk"         CHECK ("total" = "subtotal" + "delivery_fee" - "discount_amount"),
  CONSTRAINT "orders_customer_phone_chk" CHECK ("customer_phone" ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT "orders_customer_phone_alt_chk"
    CHECK ("customer_phone_alt" IS NULL OR "customer_phone_alt" ~ '^\+[1-9][0-9]{7,14}$'),
  CONSTRAINT "orders_cancelled_at_chk"
    CHECK ("status" <> 'CANCELLED' OR "cancelled_at" IS NOT NULL),
  CONSTRAINT "orders_timeline_chk" CHECK (
    ("shipped_at"   IS NULL OR "confirmed_at" IS NULL OR "shipped_at"   >= "confirmed_at") AND
    ("delivered_at" IS NULL OR "shipped_at"   IS NULL OR "delivered_at" >= "shipped_at")
  )
);

-- Ligne de commande : tout est figé au moment de l'achat
CREATE TABLE "order_items" (
  "id"            uuid           NOT NULL DEFAULT gen_random_uuid(),
  "order_id"      uuid           NOT NULL,
  "variant_id"    uuid,
  "product_name"  text           NOT NULL,
  "brand_name"    text           NOT NULL,
  "colorway_name" text           NOT NULL,
  "size_eu"       integer        NOT NULL,
  "sku"           text           NOT NULL,
  "image_url"     text,
  "unit_price"    integer        NOT NULL,
  "quantity"      integer        NOT NULL,
  "created_at"    timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_unit_price_chk" CHECK ("unit_price" > 0),
  CONSTRAINT "order_items_quantity_chk"   CHECK ("quantity" BETWEEN 1 AND 20)
);

-- Paiement Wave (code marchand, confirmé manuellement) ou à la livraison
CREATE TABLE "payments" (
  "id"             uuid             NOT NULL DEFAULT gen_random_uuid(),
  "order_id"       uuid             NOT NULL,
  "method"         "payment_method" NOT NULL,
  "status"         "payment_status" NOT NULL DEFAULT 'PENDING',
  "amount"         integer          NOT NULL,
  "wave_reference" text,
  "payer_phone"    text,
  "note"           text,
  "confirmed_at"   timestamptz(3),
  "confirmed_by"   text,
  "created_at"     timestamptz(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     timestamptz(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amount_chk" CHECK ("amount" > 0),
  CONSTRAINT "payments_wave_reference_chk"
    CHECK ("wave_reference" IS NULL OR "method" = 'WAVE'),
  CONSTRAINT "payments_paid_confirmed_chk"
    CHECK ("status" <> 'PAID' OR "confirmed_at" IS NOT NULL)
);

CREATE TABLE "order_status_history" (
  "id"          uuid           NOT NULL DEFAULT gen_random_uuid(),
  "order_id"    uuid           NOT NULL,
  "from_status" "order_status",
  "to_status"   "order_status" NOT NULL,
  "note"        text,
  "changed_by"  text,
  "created_at"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_status_history_change_chk"
    CHECK ("from_status" IS NULL OR "from_status" <> "to_status")
);

-- =============================================================================
--  CLÉS ÉTRANGÈRES  (actions identiques à schema.prisma)
-- =============================================================================

ALTER TABLE "products"
  ADD CONSTRAINT "products_brand_id_fkey"    FOREIGN KEY ("brand_id")    REFERENCES "brands"("id")     ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "colorways"
  ADD CONSTRAINT "colorways_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "colorway_images"
  ADD CONSTRAINT "colorway_images_colorway_id_fkey" FOREIGN KEY ("colorway_id") REFERENCES "colorways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "variants"
  ADD CONSTRAINT "variants_colorway_id_fkey" FOREIGN KEY ("colorway_id") REFERENCES "colorways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  -- RESTRICT : une variante qui a un historique ne se supprime pas, on la désactive (is_active = false)
  ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_movements_order_id_fkey"   FOREIGN KEY ("order_id")   REFERENCES "orders"("id")   ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collection_items"
  ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "collection_items_colorway_id_fkey"   FOREIGN KEY ("colorway_id")   REFERENCES "colorways"("id")   ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_customer_id_fkey"      FOREIGN KEY ("customer_id")      REFERENCES "customers"("id")      ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_order_id_fkey"   FOREIGN KEY ("order_id")   REFERENCES "orders"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_status_history"
  ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
--  INDEX — déclarés dans schema.prisma (noms Prisma par défaut)
-- =============================================================================

-- Unicités
CREATE UNIQUE INDEX "brands_slug_key"                    ON "brands"("slug");
CREATE UNIQUE INDEX "categories_slug_key"                ON "categories"("slug");
CREATE UNIQUE INDEX "products_slug_key"                  ON "products"("slug");
CREATE UNIQUE INDEX "colorways_slug_key"                 ON "colorways"("slug");
CREATE UNIQUE INDEX "variants_sku_key"                   ON "variants"("sku");
CREATE UNIQUE INDEX "variants_colorway_id_size_eu_key"   ON "variants"("colorway_id", "size_eu");
CREATE UNIQUE INDEX "collections_slug_key"               ON "collections"("slug");
CREATE UNIQUE INDEX "customers_phone_key"                ON "customers"("phone");
CREATE UNIQUE INDEX "delivery_zones_name_key"            ON "delivery_zones"("name");
CREATE UNIQUE INDEX "orders_reference_key"               ON "orders"("reference");
CREATE UNIQUE INDEX "payments_wave_reference_key"        ON "payments"("wave_reference");

-- Clés étrangères et tris fréquents
CREATE INDEX "products_brand_id_idx"                      ON "products"("brand_id");
CREATE INDEX "products_category_id_idx"                   ON "products"("category_id");
CREATE INDEX "products_gender_is_active_idx"              ON "products"("gender", "is_active");
CREATE INDEX "colorways_product_id_idx"                   ON "colorways"("product_id");
CREATE INDEX "colorway_images_colorway_id_position_idx"   ON "colorway_images"("colorway_id", "position");
CREATE INDEX "stock_movements_variant_id_created_at_idx"  ON "stock_movements"("variant_id", "created_at" DESC);
CREATE INDEX "stock_movements_order_id_idx"               ON "stock_movements"("order_id");
CREATE INDEX "collection_items_collection_id_position_idx" ON "collection_items"("collection_id", "position");
CREATE INDEX "collection_items_colorway_id_idx"           ON "collection_items"("colorway_id");
CREATE INDEX "orders_status_created_at_idx"               ON "orders"("status", "created_at" DESC);
CREATE INDEX "orders_customer_id_created_at_idx"          ON "orders"("customer_id", "created_at" DESC);
CREATE INDEX "orders_customer_phone_idx"                  ON "orders"("customer_phone");
CREATE INDEX "order_items_order_id_idx"                   ON "order_items"("order_id");
CREATE INDEX "order_items_variant_id_idx"                 ON "order_items"("variant_id");
CREATE INDEX "payments_order_id_idx"                      ON "payments"("order_id");
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- Recherche floue (trigram) : "air forc", "triple whi", "new bal"…
CREATE INDEX "brands_name_idx"    ON "brands"    USING GIN ("name" gin_trgm_ops);
CREATE INDEX "products_name_idx"  ON "products"  USING GIN ("name" gin_trgm_ops);
CREATE INDEX "colorways_name_idx" ON "colorways" USING GIN ("name" gin_trgm_ops);

-- =============================================================================
--  INDEX PARTIELS — SQL uniquement (voir note en fin de fichier)
-- =============================================================================

-- Filtre n°1 de la boutique : "tout ce qui existe en 43 et en stock"
CREATE INDEX "variants_size_in_stock_idx"
  ON "variants"("size_eu", "colorway_id")
  WHERE "stock" > 0 AND "is_active" = true;

-- Nouveautés : coloris actifs triés par date de création
CREATE INDEX "colorways_new_arrivals_idx"
  ON "colorways"("created_at" DESC)
  WHERE "is_active" = true;

-- Tri et filtre par prix sur le catalogue actif
CREATE INDEX "colorways_active_price_idx"
  ON "colorways"("price")
  WHERE "is_active" = true;

-- Coloris disponibles (au moins une paire en stock) par modèle
CREATE INDEX "colorways_in_stock_product_idx"
  ON "colorways"("product_id")
  WHERE "is_active" = true AND "total_stock" > 0;

-- Sections de la page d'accueil
CREATE INDEX "collections_home_idx"
  ON "collections"("home_position")
  WHERE "show_on_home" = true AND "is_active" = true;

-- File de travail admin : paiements Wave à confirmer
CREATE INDEX "payments_pending_idx"
  ON "payments"("created_at")
  WHERE "status" = 'PENDING';

-- File de travail admin : commandes à traiter
CREATE INDEX "orders_open_idx"
  ON "orders"("created_at")
  WHERE "status" IN ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED');

-- Commandes en attente dont la réservation de stock doit expirer
CREATE INDEX "orders_pending_expiry_idx"
  ON "orders"("expires_at")
  WHERE "status" = 'PENDING' AND "expires_at" IS NOT NULL;

-- Calcul des bestsellers (V2) : ventes par variante sur commandes livrées
CREATE INDEX "orders_delivered_at_idx"
  ON "orders"("delivered_at" DESC)
  WHERE "status" = 'DELIVERED';

-- =============================================================================
--  TRIGGERS
-- =============================================================================

-- updated_at maintenu aussi pour les écritures hors Prisma (SQL brut, scripts)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updated_at" := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'brands', 'categories', 'products', 'colorways', 'variants',
    'collections', 'customers', 'delivery_zones', 'orders', 'payments'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t || '_set_updated_at', t
    );
  END LOOP;
END;
$$;

-- colorways.total_stock = somme du stock des variantes actives
CREATE OR REPLACE FUNCTION sync_colorway_total_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE "colorways" c
       SET "total_stock" = COALESCE((
             SELECT SUM(v."stock") FROM "variants" v
              WHERE v."colorway_id" = OLD."colorway_id" AND v."is_active" = true
           ), 0)
     WHERE c."id" = OLD."colorway_id";
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW."colorway_id" IS DISTINCT FROM OLD."colorway_id"
          OR NEW."stock" IS DISTINCT FROM OLD."stock"
          OR NEW."is_active" IS DISTINCT FROM OLD."is_active") THEN
    UPDATE "colorways" c
       SET "total_stock" = COALESCE((
             SELECT SUM(v."stock") FROM "variants" v
              WHERE v."colorway_id" = NEW."colorway_id" AND v."is_active" = true
           ), 0)
     WHERE c."id" = NEW."colorway_id";
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER "variants_sync_colorway_total_stock"
  AFTER INSERT OR DELETE OR UPDATE OF "stock", "is_active", "colorway_id"
  ON "variants"
  FOR EACH ROW
  EXECUTE FUNCTION sync_colorway_total_stock();

-- =============================================================================
--  FONCTIONS MÉTIER — STOCK
-- =============================================================================

-- Réserve une paire de façon atomique.
-- Retourne true si le stock a été décrémenté, false si la pointure n'est plus disponible.
-- À appeler pour chaque ligne, dans la même transaction que la création de la commande.
CREATE OR REPLACE FUNCTION reserve_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_order_id   uuid,
  p_actor      text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE "variants"
     SET "stock" = "stock" - p_quantity
   WHERE "id" = p_variant_id
     AND "is_active" = true
     AND "stock" >= p_quantity;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO "stock_movements" ("variant_id", "order_id", "delta", "reason", "created_by")
  VALUES (p_variant_id, p_order_id, -p_quantity, 'ORDER', p_actor);

  RETURN true;
END;
$$;

-- Verrouille les coloris concernés par une commande, toujours dans le même ordre (id).
-- Le trigger total_stock met à jour la ligne colorways à chaque mouvement : sans ce
-- verrouillage ordonné, deux commandes sur les mêmes coloris peuvent s'interbloquer.
CREATE OR REPLACE FUNCTION lock_order_colorways(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
     FROM "colorways" c
    WHERE c."id" IN (
            SELECT v."colorway_id"
              FROM "order_items" oi
              JOIN "variants" v ON v."id" = oi."variant_id"
             WHERE oi."order_id" = p_order_id
          )
    ORDER BY c."id"
      FOR UPDATE;
END;
$$;

-- Réserve toutes les paires d'une commande, à appeler juste après l'insertion des
-- order_items, dans la même transaction. Si une pointure n'est plus disponible,
-- lève l'erreur [MS001] (DETAIL = variant_id) : toute la transaction
-- est annulée et le client est prévenu.
CREATE OR REPLACE FUNCTION reserve_order_stock(
  p_order_id uuid,
  p_actor    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
BEGIN
  PERFORM lock_order_colorways(p_order_id);

  FOR r IN
    SELECT "variant_id", "quantity"
      FROM "order_items"
     WHERE "order_id" = p_order_id AND "variant_id" IS NOT NULL
     ORDER BY "variant_id"
  LOOP
    IF NOT reserve_stock(r."variant_id", r."quantity", p_order_id, p_actor) THEN
      RAISE EXCEPTION '[MS001] Pointure indisponible : %', r."variant_id"
        USING ERRCODE = 'MS001', DETAIL = r."variant_id"::text;
    END IF;
  END LOOP;
END;
$$;

-- Remet en stock toutes les paires d'une commande (annulation ou retour).
-- Idempotent et sûr en concurrence : la commande est verrouillée, et le stock n'est
-- rendu qu'une seule fois par commande (une annulation puis un retour ne rendent
-- pas deux fois les mêmes paires).
CREATE OR REPLACE FUNCTION release_order_stock(
  p_order_id uuid,
  p_reason   "stock_movement_reason" DEFAULT 'CANCELLATION',
  p_actor    text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  r         record;
  v_count   integer := 0;
BEGIN
  IF p_reason NOT IN ('CANCELLATION', 'RETURN') THEN
    RAISE EXCEPTION '[MS002] Raison de remise en stock invalide : %', p_reason
      USING ERRCODE = 'MS002';
  END IF;

  PERFORM 1 FROM "orders" WHERE "id" = p_order_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM "stock_movements"
     WHERE "order_id" = p_order_id AND "reason" IN ('CANCELLATION', 'RETURN')
  ) THEN
    RETURN 0;
  END IF;

  PERFORM lock_order_colorways(p_order_id);

  FOR r IN
    SELECT "variant_id", "quantity"
      FROM "order_items"
     WHERE "order_id" = p_order_id AND "variant_id" IS NOT NULL
     ORDER BY "variant_id"
  LOOP
    UPDATE "variants" SET "stock" = "stock" + r."quantity" WHERE "id" = r."variant_id";

    INSERT INTO "stock_movements" ("variant_id", "order_id", "delta", "reason", "created_by")
    VALUES (r."variant_id", p_order_id, r."quantity", p_reason, p_actor);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Annule les commandes PENDING dont la réservation a expiré (paiement Wave jamais
-- reçu, client injoignable…) et remet leurs paires en stock.
-- L'application fixe orders.expires_at à la création (ex. Wave : +2 h, livraison : +24 h)
-- et le remet à NULL quand la vendeuse confirme la commande.
-- À lancer régulièrement (cron NestJS ou pg_cron, ex. toutes les 10 minutes).
CREATE OR REPLACE FUNCTION expire_pending_orders(p_actor text DEFAULT 'system')
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  o       record;
  v_count integer := 0;
BEGIN
  FOR o IN
    SELECT "id"
      FROM "orders"
     WHERE "status" = 'PENDING'
       AND "payment_status" <> 'PAID'
       AND "expires_at" < CURRENT_TIMESTAMP
     ORDER BY "expires_at"
       FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE "orders"
       SET "status"        = 'CANCELLED',
           "cancelled_at"  = CURRENT_TIMESTAMP,
           "cancel_reason" = 'Réservation expirée'
     WHERE "id" = o."id";

    INSERT INTO "order_status_history" ("order_id", "from_status", "to_status", "note", "changed_by")
    VALUES (o."id", 'PENDING', 'CANCELLED', 'Réservation expirée', p_actor);

    PERFORM release_order_stock(o."id", 'CANCELLATION', p_actor);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMIT;

-- =============================================================================
--  NOTE — COHABITATION AVEC PRISMA MIGRATE
--
--  Prisma ignore les CHECK, triggers, fonctions et séquences : ils restent en
--  place lors des migrations suivantes.
--
--  En revanche, Prisma ne connaît pas les INDEX PARTIELS ci-dessus : lors d'une
--  future `prisma migrate dev`, il peut proposer de les supprimer
--  (DROP INDEX "variants_size_in_stock_idx", etc.). Toujours générer avec
--  `--create-only`, relire le SQL, et retirer ces lignes avant d'appliquer.
-- =============================================================================
