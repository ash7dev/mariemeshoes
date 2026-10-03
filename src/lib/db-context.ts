import type { Prisma } from '@/generated/prisma/client';
import { prisma } from './prisma';

export type Tx = Prisma.TransactionClient;

/**
 * Options des transactions interactives : le pooler Supabase ajoute de la
 * latence, le délai par défaut de Prisma (5 s) est trop juste pour un checkout.
 */
export const TX_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;

/**
 * Déclare l'admin qui agit, pour la durée de la transaction uniquement
 * (set_config(..., true) : compatible avec le pooler PgBouncer en mode transaction).
 * Lu en base par app_admin_id() : journal d'audit, historique des statuts,
 * mouvements de stock, confirmation de paiement.
 */
export async function setAdminContext(tx: Tx, adminId: string): Promise<void> {
  await tx.$queryRaw`SELECT set_config('app.admin_id', ${adminId}, true)`;
}

/** Exécute `fn` dans une transaction signée par l'admin `adminId`. */
export function withAdmin<T>(adminId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setAdminContext(tx, adminId);
    return fn(tx);
  }, TX_OPTIONS);
}
