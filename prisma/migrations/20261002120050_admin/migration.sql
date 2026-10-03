-- @protected
-- =============================================================================
--  MARIEMESHOES — Comptes admin
--
--  Connexion par email + mot de passe via Supabase Auth. Un utilisateur Supabase
--  n'a accès à l'admin QUE s'il possède un profil actif ici (même id que auth.users).
--  Créer la vendeuse : créer l'utilisateur dans Supabase (Authentication → Users),
--  puis : INSERT INTO admin_profiles (id, full_name) VALUES ('<uuid auth>', 'Marieme');
-- =============================================================================

CREATE TYPE "admin_role" AS ENUM ('OWNER', 'STAFF');

CREATE TABLE "admin_profiles" (
  "id"         uuid           NOT NULL,
  "full_name"  varchar(120)   NOT NULL,
  "role"       "admin_role"   NOT NULL DEFAULT 'OWNER',
  "is_active"  boolean        NOT NULL DEFAULT true,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_profiles_full_name_not_blank_chk" CHECK (btrim("full_name") <> '')
);

ALTER TABLE "admin_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER "admin_profiles_set_updated_at"
  BEFORE UPDATE ON "admin_profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Lien avec Supabase Auth. RESTRICT : un admin ayant un historique ne se supprime
-- pas ; on le désactive (is_active = false) et on le bannit dans Supabase Auth.
-- Conditionnel : la migration s'applique aussi sur une base sans Supabase (shadow).
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE "admin_profiles"
      ADD CONSTRAINT "admin_profiles_auth_user_fkey"
      FOREIGN KEY ("id") REFERENCES auth.users ("id") ON DELETE RESTRICT;
  ELSE
    RAISE NOTICE 'auth.users absent (base hors Supabase) : clé étrangère admin_profiles → auth.users non créée';
  END IF;
END $$;

-- Admin qui agit dans la transaction en cours (déclaré par withAdmin(), voir
-- src/lib/db-context.ts). NULL hors contexte admin (commande passée par un client).
CREATE OR REPLACE FUNCTION app_admin_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_admin uuid := nullif(current_setting('app.admin_id', true), '')::uuid;
BEGIN
  IF v_admin IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "admin_profiles" WHERE "id" = v_admin AND "is_active") THEN
    RAISE EXCEPTION '[MS060] Administrateur inconnu ou désactivé : %', v_admin
      USING ERRCODE = 'MS060';
  END IF;
  RETURN v_admin;
END;
$$;
