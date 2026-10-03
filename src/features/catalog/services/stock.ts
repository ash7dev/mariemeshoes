import type { Tx } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';

/** Le stock aurait été négatif : des paires sont parties entre-temps. */
export class StockChangedError extends DomainError {
  constructor() {
    super('Des paires ont été vendues entre-temps : le stock a changé. Recharge la page.', 'STOCK_CHANGED');
    this.name = 'StockChangedError';
  }
}

/**
 * Applique un écart de stock en relatif (jamais d'écrasement) et le trace dans le journal.
 * Refusé si le stock deviendrait négatif. Renvoie le nouveau stock.
 */
export async function applyStockDelta(tx: Tx, adminId: string, variantId: string, delta: number, note: string): Promise<number> {
  const updated = await tx.variant.updateMany({
    where: { id: variantId, stock: { gte: -delta } },
    data: { stock: { increment: delta } },
  });
  if (updated.count === 0) throw new StockChangedError();
  await tx.stockMovement.create({
    data: { variantId, delta, reason: delta > 0 ? 'RESTOCK' : 'ADJUSTMENT', note, createdBy: adminId },
  });
  const { stock } = await tx.variant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } });
  return stock;
}
