import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';

/** Seuil « stock bas » : une pointure à une paire ou moins (souvent 1 ou 2 paires par pointure). */
export const LOW_STOCK_THRESHOLD = 1;

/** Compteurs des pastilles de la navigation admin. */
export async function getAdminCounts(): Promise<{ ordersToConfirm: number; lowStock: number }> {
  const [ordersToConfirm, lowStock] = await Promise.all([
    withDbRetry(() => prisma.order.count({ where: { status: 'PENDING' } })),
    withDbRetry(() =>
      prisma.variant.count({
        where: {
          isActive: true,
          stock: { lte: LOW_STOCK_THRESHOLD },
          colorway: { isActive: true, product: { isActive: true } },
        },
      }),
    ),
  ]);
  return { ordersToConfirm, lowStock };
}
