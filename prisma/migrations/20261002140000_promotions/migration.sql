-- @protected
-- =============================================================================
--  MARIEMESHOES — Promotions et codes promo
--
--  Deux sortes de promotions :
--    AUTOMATIC : appliquée d'office aux paires ciblées (prix barré sur la fiche).
--    CODE      : saisie par le client au panier (ex. TABASKI10, BIENVENUE).
--
--  Trois types de remise :
--    PERCENTAGE    : -15 %   (plafond facultatif : max_discount)
--    FIXED_AMOUNT  : -5 000 FCFA (automatique : par paire ; code : sur la commande)
--    FREE_DELIVERY : livraison offerte
--
--  Règles (voir src/features/promotions/rules.ts, qui les applique) :
--    1. Une paire ne reçoit qu'UNE promotion automatique : la plus avantageuse.
--    2. Une paire déjà en prix barré (compare_at_price) n'a pas de promotion automatique.
--    3. Un seul code promo par commande ; il ne s'applique qu'aux paires sans autre
--       réduction, sauf code « cumulable » (stackable).
--    4. La livraison n'est jamais remisée, sauf par FREE_DELIVERY.
--    5. Conditions d'un code : période, minimum d'achat, minimum de paires,
--       première commande, nombre d'utilisations (total et par client, par téléphone).
--    6. La remise est figée dans la commande (order_items.unit_discount, orders.discount_amount).
--    7. Une commande annulée ne compte plus comme utilisation du code.
-- =============================================================================

CREATE TYPE "promotion_kind"     AS ENUM ('AUTOMATIC', 'CODE');
CREATE TYPE "discount_type"      AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY');
CREATE TYPE "promotion_scope"    AS ENUM ('ALL', 'TARGETS');

-- -----------------------------------------------------------------------------
--  PROMOTIONS
-- -----------------------------------------------------------------------------

CREATE TABLE "promotions" (
  "id"                       uuid              NOT NULL DEFAULT gen_random_uuid(),
  "name"                     text              NOT NULL,
  "description"              text,
  "kind"                     "promotion_kind"  NOT NULL,
  "code"                     text,
  "discount_type"            "discount_type"   NOT NULL,
  "value"                    integer,
  "max_discount"             integer,
  "scope"                    "promotion_scope" NOT NULL DEFAULT 'ALL',
  "min_subtotal"             integer,
  "min_pairs"                integer,
  "first_order_only"         boolean           NOT NULL DEFAULT false,
  "usage_limit"              integer,
  "usage_limit_per_customer" integer,
  "stackable"                boolean           NOT NULL DEFAULT false,
  "starts_at"                timestamptz(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at"                  timestamptz(3),
  "is_active"                boolean           NOT NULL DEFAULT true,
  "created_at"               timestamptz(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               timestamptz(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotions_name_chk" CHECK (btrim("name") <> '' AND length("name") <= 120),

  -- Un code ⇔ une promotion CODE ; majuscules, chiffres, - et _ (saisie insensible à la casse côté appli).
  CONSTRAINT "promotions_code_chk" CHECK (
    ("kind" = 'CODE' AND "code" IS NOT NULL AND "code" ~ '^[A-Z0-9_-]{3,30}$') OR
    ("kind" = 'AUTOMATIC' AND "code" IS NULL)
  ),

  -- Valeur : obligatoire sauf livraison offerte ; pourcentage entre 1 et 100.
  CONSTRAINT "promotions_value_chk" CHECK (
    ("discount_type" = 'FREE_DELIVERY' AND "value" IS NULL) OR
    ("discount_type" = 'PERCENTAGE'    AND "value" BETWEEN 1 AND 100) OR
    ("discount_type" = 'FIXED_AMOUNT'  AND "value" > 0)
  ),
  -- Plafond : seulement pour un pourcentage.
  CONSTRAINT "promotions_max_discount_chk" CHECK (
    "max_discount" IS NULL OR ("discount_type" = 'PERCENTAGE' AND "max_discount" > 0)
  ),
  CONSTRAINT "promotions_conditions_chk" CHECK (
    ("min_subtotal" IS NULL OR "min_subtotal" > 0) AND
    ("min_pairs" IS NULL OR "min_pairs" >= 1) AND
    ("usage_limit" IS NULL OR "usage_limit" >= 1) AND
    ("usage_limit_per_customer" IS NULL OR "usage_limit_per_customer" >= 1)
  ),
  -- Promotion automatique sur les paires : le prix affiché ne peut pas dépendre du panier.
  -- (Seule la livraison offerte automatique accepte un minimum d'achat.)
  CONSTRAINT "promotions_automatic_chk" CHECK (
    "kind" = 'CODE' OR (
      "stackable" = false
      AND "first_order_only" = false
      AND "usage_limit" IS NULL
      AND "usage_limit_per_customer" IS NULL
      AND ("discount_type" = 'FREE_DELIVERY' OR ("min_subtotal" IS NULL AND "min_pairs" IS NULL))
    )
  ),
  CONSTRAINT "promotions_period_chk" CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at")
);

COMMENT ON CONSTRAINT "promotions_automatic_chk" ON "promotions" IS
  'Automatique : remise par paire (pourcentage ou montant fixe, affichée en prix barré) sans condition client, ou livraison offerte avec minimum d''achat facultatif.';

CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_kind_is_active_idx" ON "promotions"("kind", "is_active");

-- Promotions automatiques en cours (boutique : prix barrés).
CREATE INDEX "promotions_live_automatic_idx"
  ON "promotions"("starts_at", "ends_at")
  WHERE "kind" = 'AUTOMATIC' AND "is_active" = true;

-- -----------------------------------------------------------------------------
--  CIBLES (scope = TARGETS) : marque, catégorie, collection ou coloris
-- -----------------------------------------------------------------------------

CREATE TABLE "promotion_targets" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "promotion_id"  uuid NOT NULL,
  "brand_id"      uuid,
  "category_id"   uuid,
  "collection_id" uuid,
  "colorway_id"   uuid,

  CONSTRAINT "promotion_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_targets_exactly_one_chk"
    CHECK (num_nonnulls("brand_id", "category_id", "collection_id", "colorway_id") = 1)
);

ALTER TABLE "promotion_targets"
  ADD CONSTRAINT "promotion_targets_promotion_id_fkey"  FOREIGN KEY ("promotion_id")  REFERENCES "promotions"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "promotion_targets_brand_id_fkey"      FOREIGN KEY ("brand_id")      REFERENCES "brands"("id")      ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "promotion_targets_category_id_fkey"   FOREIGN KEY ("category_id")   REFERENCES "categories"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "promotion_targets_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "promotion_targets_colorway_id_fkey"   FOREIGN KEY ("colorway_id")   REFERENCES "colorways"("id")   ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "promotion_targets_promotion_id_idx" ON "promotion_targets"("promotion_id");
CREATE UNIQUE INDEX "promotion_targets_brand_key"      ON "promotion_targets"("promotion_id", "brand_id")      WHERE "brand_id" IS NOT NULL;
CREATE UNIQUE INDEX "promotion_targets_category_key"   ON "promotion_targets"("promotion_id", "category_id")   WHERE "category_id" IS NOT NULL;
CREATE UNIQUE INDEX "promotion_targets_collection_key" ON "promotion_targets"("promotion_id", "collection_id") WHERE "collection_id" IS NOT NULL;
CREATE UNIQUE INDEX "promotion_targets_colorway_key"   ON "promotion_targets"("promotion_id", "colorway_id")   WHERE "colorway_id" IS NOT NULL;

-- -----------------------------------------------------------------------------
--  COMMANDES : remise figée
--    order_items.unit_price    : prix catalogue au moment de l'achat
--    order_items.unit_discount : remise automatique par paire (promotion figée)
--    orders.subtotal           : Σ (unit_price - unit_discount) × quantity
--    orders.discount_amount    : remise du code promo (hors livraison)
--    orders.delivery_fee       : 0 si livraison offerte (promotion_id renseigné)
-- -----------------------------------------------------------------------------

ALTER TABLE "order_items"
  ADD COLUMN "unit_discount"  integer NOT NULL DEFAULT 0,
  ADD COLUMN "promotion_id"   uuid,
  ADD COLUMN "promotion_name" text,
  ADD CONSTRAINT "order_items_unit_discount_chk" CHECK ("unit_discount" >= 0 AND "unit_discount" < "unit_price"),
  ADD CONSTRAINT "order_items_discount_has_promotion_chk" CHECK (("unit_discount" > 0) = ("promotion_id" IS NOT NULL)),
  ADD CONSTRAINT "order_items_promotion_has_name_chk" CHECK (("promotion_id" IS NULL) = ("promotion_name" IS NULL)),
  ADD CONSTRAINT "order_items_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "order_items_promotion_id_idx" ON "order_items"("promotion_id");

ALTER TABLE "orders"
  ADD COLUMN "promotion_id"   uuid,
  ADD COLUMN "promotion_code" text,
  ADD CONSTRAINT "orders_promotion_code_chk" CHECK (("promotion_id" IS NULL) = ("promotion_code" IS NULL)),
  ADD CONSTRAINT "orders_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comptage des utilisations d'un code (total et par client).
CREATE INDEX "orders_promotion_usage_idx" ON "orders"("promotion_id", "customer_phone") WHERE "promotion_id" IS NOT NULL;

-- -----------------------------------------------------------------------------
--  TRIGGERS ET FONCTIONS
-- -----------------------------------------------------------------------------

CREATE TRIGGER "promotions_set_updated_at"
  BEFORE UPDATE ON "promotions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Utilisations d'un code : commandes non annulées (une annulation libère l'utilisation).
-- À appeler dans la transaction de commande APRÈS « SELECT … FROM promotions WHERE id = … FOR UPDATE »
-- (deux clients ne peuvent pas prendre en même temps la dernière utilisation).
CREATE OR REPLACE FUNCTION promotion_usage(p_promotion_id uuid, p_phone text)
RETURNS TABLE ("total" integer, "by_customer" integer)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE "customer_phone" = p_phone)::integer
  FROM "orders"
  WHERE "promotion_id" = p_promotion_id
    AND "status" NOT IN ('CANCELLED');
$$;

-- Première commande : aucun achat non annulé avec ce numéro.
CREATE OR REPLACE FUNCTION is_first_order(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM "orders" WHERE "customer_phone" = p_phone AND "status" NOT IN ('CANCELLED')
  );
$$;

-- -----------------------------------------------------------------------------
--  SÉCURITÉ SUPABASE (comme la migration security)
-- -----------------------------------------------------------------------------

ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotion_targets" ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION promotion_usage(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_first_order(text) FROM PUBLIC;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format('REVOKE ALL ON "promotions", "promotion_targets" FROM %I', v_role);
      EXECUTE format('REVOKE ALL ON FUNCTION promotion_usage(uuid, text), is_first_order(text) FROM %I', v_role);
    END IF;
  END LOOP;
END $$;
