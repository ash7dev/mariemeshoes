-- @protected
-- =============================================================================
--  MARIEMESHOES — Sécurité Supabase
--
--  Supabase expose le schéma public via son API REST (tables ET fonctions, en RPC)
--  aux rôles anon / authenticated. L'application passe uniquement par Prisma
--  (rôle propriétaire, non soumis à la RLS) : l'API directe est donc fermée.
--
--  Chaque bloc est conditionnel : la migration s'applique aussi sur une base
--  PostgreSQL sans Supabase (shadow database).
-- =============================================================================

-- -----------------------------------------------------------------------------
--  1. ROW LEVEL SECURITY
--     RLS activée sans politique = aucun accès via l'API.
--     Boucle sur toutes les tables du schéma : aucune n'est oubliée.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
--  2. PRIVILÈGES
--     - Aucun droit pour anon / authenticated, sur l'existant ET sur les objets
--       créés plus tard (ALTER DEFAULT PRIVILEGES).
--     - Fonctions : EXECUTE retiré à PUBLIC. Sans cela, reserve_stock() ou
--       release_order_stock() seraient appelables via /rest/v1/rpc/…
-- -----------------------------------------------------------------------------

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM %I', v_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', v_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', v_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM %I', v_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', v_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', v_role);
    END IF;
  END LOOP;
END $$;
