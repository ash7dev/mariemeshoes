import { Prisma } from '@/generated/prisma/client';

/**
 * Erreurs de connexion passagères (pooler saturé, connexion coupée, délai
 * d'attente) : la même lecture réussit en général un instant plus tard.
 * P1001 injoignable · P1002 délai · P1008 délai d'opération · P1017 connexion
 * fermée · P2024 délai d'obtention d'une connexion du pool.
 */
const TRANSIENT = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

/**
 * Erreur remontée par le pilote PostgreSQL (adaptateur pg) : coupure ou délai côté
 * réseau / pooler. 08xxx = « connection exception » (08006 : échec de connexion) ;
 * EAUTHTIMEOUT : le pooler Supabase n'a pas authentifié la connexion à temps.
 */
const DRIVER_TRANSIENT = /EAUTHTIMEOUT|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|timeout|terminat|Connection (?:terminated|ended)|\b08\d{3}\b/i;

function isDriverTransient(error: Prisma.PrismaClientKnownRequestError): boolean {
  const driver = (error.meta as { driverAdapterError?: unknown } | undefined)?.driverAdapterError;
  const text = `${driver instanceof Error ? driver.message : String(driver ?? '')} ${error.message}`;
  return Boolean(driver) && DRIVER_TRANSIENT.test(text);
}

function isTransient(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return TRANSIENT.has(error.code) || isDriverTransient(error);
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return /connection|connect|timed out|terminat/i.test(error.message);
  return false;
}

/**
 * Relance une LECTURE (jamais une écriture ni une transaction) après une
 * erreur de connexion passagère : 2 nouvelles tentatives, 300 ms puis 1 s.
 */
export async function withDbRetry<T>(read: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await read();
    } catch (error) {
      if (i >= attempts || !isTransient(error)) throw error;
      await new Promise((r) => setTimeout(r, i === 1 ? 300 : 1_000));
    }
  }
}
