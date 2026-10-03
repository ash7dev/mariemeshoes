import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Avec un prisma.config.ts, la CLI Prisma ne charge plus aucun fichier .env :
// on charge .env.local nous-mêmes (absent sur Vercel, où les variables sont injectées).
try {
  process.loadEnvFile(path.join(__dirname, '.env.local'));
} catch {
  // Pas de .env.local : variables fournies par l'environnement.
}

const { DIRECT_URL, SHADOW_DATABASE_URL } = process.env;

const base = {
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
};

// La CLI (migrate, studio) passe par DIRECT_URL ; l'application utilise DATABASE_URL
// (voir src/lib/prisma.ts). `prisma migrate dev` rejoue les migrations dans une base
// « shadow » : sur Supabase, un second projet dédié (jamais la production).
export default DIRECT_URL
  ? defineConfig({
      ...base,
      datasource: { url: DIRECT_URL, shadowDatabaseUrl: SHADOW_DATABASE_URL || undefined },
    })
  : defineConfig(base);
