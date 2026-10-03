import Link from 'next/link';
import { BarChart3, ChevronRight, Inbox, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_UI } from '@/features/orders/labels';
import type { DashboardData } from '../../queries';
import { initials, money, num } from '../../format';
import { Amount } from './amounts';

/** Cette semaine : 7 barres (aujourd'hui en magenta), total et meilleur jour. */
export function WeekBars({ week }: { week: DashboardData['week'] }) {
  const total = week.reduce((sum, d) => sum + d.revenue, 0);
  const max = Math.max(1, ...week.map((d) => d.revenue));
  const best = week.reduce((a, b) => (b.revenue > a.revenue ? b : a), week[0]);

  return (
    <section aria-labelledby="week-title" className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="week-title" className="font-display text-[1.375rem] leading-tight">
          Cette semaine
        </h2>
        <p className="flex items-baseline gap-1.5">
          <Amount className="font-display text-[1.375rem] leading-none">{num(total)}</Amount>
          <span className="text-xs text-muted-ink">FCFA</span>
        </p>
      </div>
      <div role="img" aria-label={total ? `Chiffre d’affaires des 7 derniers jours : ${money(total)}` : 'Aucune vente ces 7 derniers jours'} className="relative grid h-[140px] grid-cols-7 items-end gap-2">
        {total === 0 && (
          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1.5 pt-3 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-surface text-accent-ink ring-1 ring-border">
              <BarChart3 className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span className="text-[0.8125rem] font-medium">Tes 7 derniers jours s’afficheront ici</span>
          </div>
        )}
        {week.map((d, i) => (
          <div key={d.key} className="flex h-full flex-col items-center justify-end gap-2" title={`${d.fullLabel} · ${money(d.revenue)}`}>
            <span
              className={cn('w-full rounded-[10px]', total === 0 ? 'bg-card' : d.isCurrent ? 'bg-accent' : 'bg-deep')}
              style={{ height: total === 0 ? `${18 + 14 * (0.5 + 0.5 * Math.sin(i))}%` : `${Math.max(4, (d.revenue / max) * 80)}%` }}
            />
            <span className={cn('text-[0.6875rem]', d.isCurrent ? 'font-bold text-accent-ink' : 'font-medium text-muted-ink')}>{d.label}</span>
          </div>
        ))}
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-ink">
          Meilleur jour : <strong className="font-semibold text-ink">{best.fullLabel} · <Amount>{money(best.revenue)}</Amount></strong>
        </p>
      )}
    </section>
  );
}

/** Activité : les dernières commandes (lien vers la fiche). */
export function ActivityList({ orders }: { orders: DashboardData['recent'] }) {
  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="activity-title" className="font-display text-[1.375rem] leading-tight">
          Activité
        </h2>
        <Link href="/admin/commandes?onglet=toutes" className="text-[0.8125rem] font-semibold text-accent-ink">
          Tout voir
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[24px] border border-dashed border-border bg-surface px-4 py-5 text-sm text-muted-ink">
          <Inbox className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
          Aucune commande pour l’instant : partage ta boutique sur WhatsApp ou Instagram.
        </div>
      ) : (
        <ul className="rounded-[24px] border border-border bg-surface px-3.5">
          {orders.map((o) => {
            const ui = ORDER_STATUS_UI[o.status];
            return (
              <li key={o.id} className="border-b border-border last:border-b-0">
                <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-3 py-3">
                  <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-section font-display text-sm text-deep">{initials(o.customerName)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{o.customerName}</span>
                    <span className="truncate text-xs text-muted-ink">{o.item ?? o.reference}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Amount className="text-sm font-bold">{num(o.total)}</Amount>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.65625rem] font-bold', ui.chip)}>{ui.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Bandeau stock bas (masqué s'il n'y a rien). */
export function LowStockBanner({ low }: { low: DashboardData['low'] }) {
  if (low.count === 0 || !low.first) return null;
  return (
    <Link href="/admin/produits?statut=stock-bas" className="flex items-center gap-3 rounded-[22px] bg-[#FBE3EE] px-4 py-3.5 text-accent-ink">
      <TriangleAlert className="size-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-sm">
          {low.count} pointure{low.count > 1 ? 's' : ''} en stock bas
        </strong>
        <span className="truncate text-xs">
          {low.first.label} · {low.first.stock === 0 ? 'épuisée' : `${low.first.stock} paire${low.first.stock > 1 ? 's' : ''}`}
        </span>
      </span>
      <span className="flex items-center text-[0.8125rem] font-semibold">
        Réassort <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}
