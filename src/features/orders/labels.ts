import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/enums';

/** Libellés et pastilles de statut, partagés par tout l'admin. */
export const ORDER_STATUS_UI: Record<OrderStatus, { label: string; chip: string }> = {
  PENDING: { label: 'À confirmer', chip: 'bg-[#FBE3EE] text-accent-ink' },
  CONFIRMED: { label: 'Confirmée', chip: 'bg-section text-section-ink' },
  PREPARING: { label: 'En préparation', chip: 'bg-card text-ink' },
  SHIPPED: { label: 'En livraison', chip: 'bg-deep text-cream' },
  DELIVERED: { label: 'Livrée', chip: 'bg-[#E3F1E6] text-[#1F6B3A]' },
  CANCELLED: { label: 'Annulée', chip: 'border border-border text-muted-ink' },
  RETURNED: { label: 'Retournée', chip: 'border border-border text-muted-ink' },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  WAVE: 'Wave',
  CASH_ON_DELIVERY: 'À la livraison',
};

export function paymentUi(method: PaymentMethod, status: PaymentStatus): { label: string; chip: string } {
  if (status === 'REFUNDED') return { label: 'Remboursée', chip: 'border border-border text-muted-ink' };
  if (status === 'FAILED') return { label: `${PAYMENT_METHOD_LABEL[method]} · échec`, chip: 'bg-[#FBE3EE] text-accent-ink' };
  if (status === 'PAID') return { label: `${PAYMENT_METHOD_LABEL[method]} · payé`, chip: 'bg-[#E3F1E6] text-[#1F6B3A]' };
  return method === 'WAVE'
    ? { label: 'Wave · à vérifier', chip: 'bg-accent text-white' }
    : { label: 'À la livraison', chip: 'bg-card text-ink' };
}

/** Au-delà, une commande à confirmer est signalée : le client attend. */
export const WAITING_ALERT_HOURS = 2;
