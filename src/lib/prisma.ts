import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  /** Classe qui a créé le client en cache (voir plus bas). */
  prismaClass: typeof PrismaClient | undefined;
};

/**
 * Client Prisma unique (réutilisé entre les rechargements à chaud en développement).
 *
 * DATABASE_URL : pooler Supabase en MODE TRANSACTION (port 6543) en production
 * (Vercel serverless : une connexion n'est prêtée que le temps d'une requête).
 * Les migrations utilisent DIRECT_URL (voir prisma.config.ts).
 */
function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Peu de connexions, réutilisées : le pooler Supabase authentifie chaque NOUVELLE connexion,
    // et en ouvrir 10 d'un coup (une page qui lance plusieurs requêtes en parallèle) peut
    // dépasser son délai d'authentification (EAUTHTIMEOUT). Les requêtes en trop attendent
    // leur tour quelques millisecondes au lieu d'échouer.
    max: Number(process.env.DB_POOL_MAX) || 5,
    // Ne jamais attendre indéfiniment une connexion : l'erreur part vers withDbRetry.
    connectionTimeoutMillis: 10_000,
    // Connexion inutilisée rendue au pooler après 30 s.
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Développement : après `prisma generate` (nouvelle table, nouveau champ), le module du
// client est rechargé et sa classe change. Le client en cache, créé par l'ancienne classe,
// ne connaît pas les nouveaux modèles (« Cannot read properties of undefined ») :
// on le remplace au lieu de le réutiliser.
const cached = globalForPrisma.prismaClass === PrismaClient ? globalForPrisma.prisma : undefined;
if (globalForPrisma.prisma && !cached) void globalForPrisma.prisma.$disconnect().catch(() => {});

export const prisma = cached ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClass = PrismaClient;
}
