import Image from 'next/image';
import Link from 'next/link';
import { Clock, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatRelative, hoursSince } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { WAITING_ALERT_HOURS } from '../labels';
import type { AdminOrderRow } from '../queries';
import { PaymentChip, StatusChip, expiryLabel } from './order-ui';

/**
 * Liste des commandes. Ordinateur : lignes en colonnes. Mobile : cartes.
 * Toute la ligne mène à la fiche (lien sur la référence, étendu à la ligne).
 */
export default function OrderList({ orders }: { orders: AdminOrderRow[] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-6 border-b border-border px-6 py-3 text-[0.71875rem] font-semibold uppercase tracking-[0.16em] text-muted-ink lg:grid"
      >
        <span>Commande</span>
        <span>Client</span>
        <span>Paires</span>
        <span>Total</span>
        <span>Statut</span>
      </div>

      <ul className="divide-y divide-border">
        {orders.map((order) => {
          const waiting = order.status === 'PENDING' && hoursSince(order.createdAt) >= WAITING_ALERT_HOURS;
          const expiry = order.status === 'PENDING' ? expiryLabel(order.expiresAt) : null;
          return (
            <li
              key={order.id}
              className={cn(
                'relative grid grid-cols-2 gap-x-4 gap-y-3 p-4 transition-colors hover:bg-page lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:items-center lg:gap-6 lg:px-6',
                order.status === 'PENDING' && 'bg-[#FBE3EE]/25',
              )}
            >
              {/* Commande */}
              <div className="flex flex-col gap-1">
                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="font-semibold tabular-nums after:absolute after:inset-0 after:content-[''] hover:text-accent-ink"
                >
                  {order.reference}
                </Link>
                <span className="text-[0.8125rem] text-muted-ink" suppressHydrationWarning>
                  {formatRelative(order.createdAt)}
                </span>
                {(waiting || expiry?.urgent) && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-accent-ink" suppressHydrationWarning>
                    <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
                    {expiry?.urgent ? expiry.text : 'Le client attend'}
                  </span>
                )}
              </div>

              {/* Client */}
              <div className="flex min-w-0 flex-col gap-1 text-right lg:text-left">
                <span className="truncate text-[0.9375rem] font-medium">{order.customerName}</span>
                <span className="text-[0.8125rem] tabular-nums text-muted-ink">{formatSenegalPhone(order.customerPhone)}</span>
                {order.zoneName && <span className="truncate text-xs text-muted-ink">{order.zoneName}</span>}
              </div>

              {/* Paires */}
              <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                {order.items.length === 0 ? (
                  <span className="text-sm text-muted-ink">Aucun article</span>
                ) : (
                  <>
                    <div className="flex shrink-0 -space-x-3">
                      {order.items.map((item, index) => (
                        <span key={index} className="grid size-11 place-items-center overflow-hidden rounded-xl bg-card ring-2 ring-surface">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt="" width={88} height={88} sizes="44px" className="size-full object-contain p-1 mix-blend-multiply" />
                          ) : (
                            <ImageOff className="size-4 text-muted-ink" strokeWidth={1.6} aria-hidden="true" />
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm">{order.items[0].label}</span>
                      <span className="text-xs text-muted-ink">
                        Pointure {order.items[0].sizeEu}
                        {order.items[0].quantity > 1 ? ` · ×${order.items[0].quantity}` : ''}
                        {order.items.length + order.moreItems > 1 ? ` · ${order.pairs} paires au total` : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Total */}
              <span className="self-center text-[0.9375rem] font-semibold tabular-nums">{formatFCFA(order.total)}</span>

              {/* Statut */}
              <div className="flex flex-wrap items-center justify-end gap-1.5 lg:flex-col lg:items-start">
                <StatusChip status={order.status} />
                <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
