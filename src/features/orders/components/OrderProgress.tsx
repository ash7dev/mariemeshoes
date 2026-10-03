import { Check, RotateCcw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFullDate } from '@/lib/dates';
import type { OrderDetail } from '../queries';

const STEPS = [
  { status: 'PENDING', label: 'Reçue' },
  { status: 'CONFIRMED', label: 'Confirmée' },
  { status: 'PREPARING', label: 'Préparée' },
  { status: 'SHIPPED', label: 'En livraison' },
  { status: 'DELIVERED', label: 'Livrée' },
] as const;

/** Frise de progression (Reçue → Livrée) ; bandeau dédié si annulée ou retournée. */
export default function OrderProgress({ order }: { order: OrderDetail }) {
  if (order.status === 'CANCELLED' || order.status === 'RETURNED') {
    const cancelled = order.status === 'CANCELLED';
    const Icon = cancelled ? XCircle : RotateCcw;
    const last = order.history.at(-1);
    return (
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-muted-ink">
          <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-medium">{cancelled ? 'Commande annulée' : 'Commande retournée'}</p>
          <p className="text-sm text-muted-ink" suppressHydrationWarning>
            {cancelled && order.cancelledAt ? formatFullDate(order.cancelledAt) : last ? formatFullDate(last.createdAt) : ''}
            {' · '}les paires sont revenues en stock.
          </p>
          {(order.cancelReason || last?.note) && <p className="text-sm">Motif : {cancelled ? order.cancelReason : last?.note}</p>}
        </div>
      </div>
    );
  }

  const prepared = order.history.find((h) => h.toStatus === 'PREPARING')?.createdAt ?? null;
  const dates: Record<(typeof STEPS)[number]['status'], Date | null> = {
    PENDING: order.createdAt,
    CONFIRMED: order.confirmedAt,
    PREPARING: prepared,
    SHIPPED: order.shippedAt,
    DELIVERED: order.deliveredAt,
  };
  const currentIndex = STEPS.findIndex((step) => step.status === order.status);

  return (
    <ol className="grid grid-cols-5 gap-1">
      {STEPS.map((step, index) => {
        // Préparation sautée (confirmée → expédiée directement) : étape grisée mais franchie.
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const date = dates[step.status];
        return (
          <li key={step.status} className="flex flex-col items-center gap-2 text-center">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', index === 0 ? 'opacity-0' : done ? 'bg-deep' : 'bg-border')} />
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold',
                  current ? 'bg-accent text-white ring-4 ring-[#FBE3EE]' : done ? 'bg-deep text-cream' : 'border border-border bg-surface text-muted-ink',
                )}
              >
                {done && !current ? <Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn('h-0.5 flex-1', index === STEPS.length - 1 ? 'opacity-0' : index < currentIndex ? 'bg-deep' : 'bg-border')} />
            </div>
            <span className={cn('text-xs font-semibold sm:text-[0.8125rem]', done ? 'text-ink' : 'text-muted-ink')}>{step.label}</span>
            <span className="hidden text-[0.6875rem] leading-tight text-muted-ink sm:block" suppressHydrationWarning>
              {date ? formatFullDate(date) : done ? '—' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
