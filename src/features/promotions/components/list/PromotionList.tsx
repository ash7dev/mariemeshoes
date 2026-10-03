import Link from 'next/link';
import { Tag, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFullDate } from '@/lib/dates';
import { discountLabel, promotionStatus } from '../../describe';
import type { AdminPromotionRow } from '../../list-queries';
import PromotionRowActions from './PromotionRowActions';

const STATUS_CHIP = {
  live: 'bg-accent text-white',
  scheduled: 'bg-section text-section-ink',
  ended: 'border border-border text-muted-ink',
  off: 'border border-border text-muted-ink',
} as const;

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Dakar' });

function periodLabel(startsAt: Date, endsAt: Date | null): string {
  if (!endsAt) return `Depuis le ${dayFormat.format(startsAt)} · sans fin`;
  return `Du ${dayFormat.format(startsAt)} au ${dayFormat.format(endsAt)}`;
}

/** Liste des promotions. Ordinateur : lignes en colonnes. Mobile : cartes. */
export default function PromotionList({ promotions }: { promotions: AdminPromotionRow[] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-6 border-b border-border px-6 py-3 text-[0.71875rem] font-semibold uppercase tracking-[0.16em] text-muted-ink lg:grid"
      >
        <span>Promotion</span>
        <span>Remise</span>
        <span>Période</span>
        <span>Utilisation</span>
        <span className="w-[13rem]" />
      </div>

      <ul className="divide-y divide-border">
        {promotions.map((p) => {
          const status = promotionStatus(p);
          const Icon = p.kind === 'CODE' ? Ticket : Tag;
          const used = p.kind === 'CODE' ? p.orders : p.pairs;
          const ratio = p.usageLimit ? Math.min(1, used / p.usageLimit) : null;
          return (
            <li
              key={p.id}
              className={cn(
                'grid grid-cols-2 gap-x-4 gap-y-3 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-6',
                !p.isActive && 'bg-page/60',
              )}
            >
              {/* Promotion */}
              <div className="col-span-2 flex min-w-0 items-start gap-3 lg:col-span-1">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', p.kind === 'CODE' ? 'bg-deep text-cream' : 'bg-section text-section-ink')}>
                  <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/promotions/${p.id}`} className="truncate font-semibold hover:text-accent-ink">
                      {p.name}
                    </Link>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold', STATUS_CHIP[status.tone])}>{status.label}</span>
                  </div>
                  {p.code ? (
                    <span className="self-start rounded-lg border border-dashed border-accent-ink px-2 py-0.5 font-mono text-[0.8125rem] font-semibold tracking-wide text-accent-ink">
                      {p.code}
                    </span>
                  ) : (
                    <span className="text-[0.8125rem] text-muted-ink">Automatique · prix barré</span>
                  )}
                </div>
              </div>

              {/* Remise */}
              <div className="flex flex-col gap-1">
                <span className="font-semibold">
                  {discountLabel(p)}
                  {p.kind === 'AUTOMATIC' && p.discountType === 'FIXED_AMOUNT' ? ' / paire' : ''}
                </span>
                <span className="text-[0.8125rem] text-muted-ink">{p.targetsLabel}</span>
                {p.conditions.length > 0 && <span className="text-xs text-muted-ink">{p.conditions.join(' · ')}</span>}
              </div>

              {/* Période */}
              <div className="flex flex-col gap-1 text-[0.8125rem]" title={`${formatFullDate(p.startsAt)}${p.endsAt ? ` → ${formatFullDate(p.endsAt)}` : ''}`}>
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-ink lg:hidden">Période</span>
                <span>{periodLabel(p.startsAt, p.endsAt)}</span>
              </div>

              {/* Utilisation */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm">
                  <span className="font-semibold tabular-nums">{used}</span>
                  {p.usageLimit ? <span className="text-muted-ink"> / {p.usageLimit}</span> : null}
                  <span className="text-muted-ink"> {p.kind === 'CODE' ? `commande${used > 1 ? 's' : ''}` : `paire${used > 1 ? 's' : ''}`}</span>
                </span>
                {ratio !== null && (
                  <span className="h-1.5 w-full max-w-[9rem] overflow-hidden rounded-full bg-card" aria-hidden="true">
                    <span className={cn('block h-full rounded-full', ratio >= 1 ? 'bg-accent-ink' : 'bg-accent')} style={{ width: `${ratio * 100}%` }} />
                  </span>
                )}
                {ratio !== null && ratio >= 1 && <span className="text-xs font-medium text-accent-ink">Limite atteinte</span>}
              </div>

              {/* Actions */}
              <div className="col-span-2 flex justify-end lg:col-span-1">
                <PromotionRowActions id={p.id} name={p.name} code={p.code} isActive={p.isActive} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
