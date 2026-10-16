-- @protected
-- =============================================================================
--  MARIEMESHOES — Notifications push (admin)
--
--  Un abonnement = un navigateur d'un admin (téléphone, ordinateur). Le serveur
--  y envoie les alertes (nouvelle commande, stock bas…) signées avec la clé VAPID.
--  Un abonnement expiré (le navigateur répond 404/410) est supprimé à l'envoi.
-- =============================================================================

CREATE TABLE "push_subscriptions" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "admin_id"     uuid NOT NULL,
  "endpoint"     text NOT NULL,
  "p256dh"       text NOT NULL,
  "auth"         text NOT NULL,
  "user_agent"   text,
  "created_at"   timestamptz(3) NOT NULL DEFAULT now(),
  "last_sent_at" timestamptz(3),

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_subscriptions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "push_subscriptions_endpoint_chk" CHECK ("endpoint" ~ '^https://' AND char_length("endpoint") <= 2000),
  CONSTRAINT "push_subscriptions_keys_chk" CHECK (char_length("p256dh") BETWEEN 1 AND 200 AND char_length("auth") BETWEEN 1 AND 100),
  CONSTRAINT "push_subscriptions_user_agent_chk" CHECK ("user_agent" IS NULL OR char_length("user_agent") <= 400)
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions" ("endpoint");
CREATE INDEX "push_subscriptions_admin_idx" ON "push_subscriptions" ("admin_id");

ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format('REVOKE ALL ON "push_subscriptions" FROM %I', v_role);
    END IF;
  END LOOP;
END $$;
