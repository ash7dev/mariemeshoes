import Link from 'next/link';
import { Bell, Images, Plus, TicketPercent, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardData } from '../../queries';
import { num, signedPercent, trendOf } from '../../format';
import { PeriodSwitch } from '../ui';
import { Amount, AmountsToggle } from './amounts';

const dateLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

/** Bornes des mini-barres : « 1 oct. » / « 31 oct. » (jours), « janv. » / « déc. » (mois). */
function edgeLabel(bucket: { label: string; fullLabel: string } | undefined, kind: 'day' | 'month'): string {
  if (!bucket) return '';
  return kind === 'month' ? bucket.label : bucket.fullLabel.split(' ').slice(1).join(' ');
}

const TREND_ON_DARK = {
  up: 'bg-[#9BC27A]/20 text-[#C4DDAE]',
  down: 'bg-[#E07A5F]/20 text-[#F2B8A8]',
  flat: 'bg-cream/10 text-cream/80',
};

/**
 * En-tête « wallet » du mobile (repris de MAT) : identité, CA de la période,
 * mini-barres empilées (même langage que l'ordinateur : encaissé, en attente,
 * aujourd'hui en crème, à venir en fantôme), période, puis actions rapides.
 */
export default function WalletHeader({ data, firstName }: { data: DashboardData; firstName: string }) {
  const { revenue, period } = data;
  const trend = trendOf(revenue.change);
  const series = revenue.series;
  const max = Math.max(1, ...series.map((b) => b.paid + b.pending));
  const empty = revenue.revenue === 0;
  const toConfirm = data.queue.filter((item) => item.kind === 'confirm').length;
  const gap = series.length > 12 ? 3 : 8;

  return (
    <>
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-b-[36px] bg-deep px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-cream">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-16 size-64 rounded-full border border-accent-soft/15" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 top-0 size-40 rounded-full border border-accent-soft/10" />

        <div className="relative flex items-center gap-3">
          <Link href="/admin/compte" aria-label="Mon compte" className="grid size-11 shrink-0 place-items-center rounded-full bg-cream font-display text-lg text-deep">
            {firstName.charAt(0).toUpperCase()}
          </Link>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span suppressHydrationWarning className="truncate text-xs text-cream/75 first-letter:uppercase">
              {dateLong.format(new Date())}
            </span>
            <span className="truncate text-[1.0625rem] font-semibold">Bonjour {firstName}</span>
          </span>
          <Link
            href="/admin/commandes?onglet=a-confirmer"
            aria-label={toConfirm ? `${toConfirm} commande${toConfirm > 1 ? 's' : ''} à confirmer` : 'Commandes'}
            className="relative grid size-11 shrink-0 place-items-center rounded-full bg-cream/10"
          >
            <Bell className="size-5" strokeWidth={1.8} aria-hidden="true" />
            {toConfirm > 0 && <span className="absolute right-[11px] top-[10px] size-2 rounded-full bg-accent ring-2 ring-deep" />}
          </Link>
        </div>

        <div className="relative flex flex-col gap-2">
          <span className="flex items-center gap-1 text-xs tracking-[0.06em] text-cream/75">
            Chiffre d’affaires · {period.label}
            <AmountsToggle className="-my-2" />
          </span>
          <p className="flex items-baseline gap-2">
            <Amount className="font-display text-[2.875rem] leading-[0.95]">{num(revenue.revenue)}</Amount>
            <span className="text-[0.9375rem] text-cream/75">FCFA</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {revenue.change !== null && (
              <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 font-semibold tabular-nums', TREND_ON_DARK[trend])}>
                {trend === 'up' ? '↗ ' : trend === 'down' ? '↘ ' : ''}
                {signedPercent(revenue.change)}
              </span>
            )}
            <span className="text-cream/75">{period.compareLabel}</span>
          </p>
        </div>

        {/* Mini-barres */}
        <div className="relative flex flex-col gap-1.5">
          <div role="img" aria-label={empty ? 'Aucune vente sur la période' : 'Chiffre d’affaires par période'} className="grid h-[76px] items-end" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`, gap }}>
            {series.map((b, i) => {
              const total = b.paid + b.pending;
              if (empty) {
                return <span key={b.key} className="block rounded-[3px] bg-cream/[0.07]" style={{ height: `${12 + 20 * (0.5 + 0.5 * Math.sin(i * 0.7))}%` }} />;
              }
              if (b.isFuture || total === 0) {
                return <span key={b.key} className={cn('block h-1 rounded-full', b.isFuture ? 'bg-cream/10' : 'bg-cream/20')} />;
              }
              return (
                <span key={b.key} className="flex flex-col gap-[2px]" style={{ height: `${Math.max(4, (total / max) * 100)}%` }}>
                  {b.pending > 0 && <span className="block min-h-[2px] rounded-t-[4px] rounded-b-[2px] bg-accent-soft/35" style={{ flexGrow: b.pending }} />}
                  {b.paid > 0 && <span className={cn('block min-h-[2px] rounded-b-[4px] rounded-t-[2px]', b.isCurrent ? 'bg-cream' : 'bg-accent-soft')} style={{ flexGrow: b.paid }} />}
                </span>
              );
            })}
          </div>
          <div className="flex justify-between text-[0.6875rem] text-cream/70">
            <span>{edgeLabel(series[0], period.bucket)}</span>
            <span className="flex gap-3">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-accent-soft" />encaissé</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-accent-soft/35" />en attente</span>
            </span>
            <span>{edgeLabel(series.at(-1), period.bucket)}</span>
          </div>
        </div>

        <PeriodSwitch current={period.key} tone="dark" labels={{ '7j': 'Semaine', mois: 'Mois', annee: 'Année' }} className="relative" />
      </header>

      {/* Actions rapides, à cheval sur l'en-tête */}
      <nav aria-label="Actions rapides" className="relative z-10 mx-4 -mt-10 grid grid-cols-4 rounded-[28px] bg-surface px-2 py-4 shadow-[0_18px_40px_rgb(42_14_30/0.14)]">
        {[
          { href: '/admin/produits/nouveau', label: 'Produit', icon: Plus, strong: true },
          { href: '/admin/promotions/nouvelle', label: 'Promo', icon: TicketPercent },
          { href: '/admin/clients', label: 'Clients', icon: Users },
          { href: '/admin/galerie', label: 'Galerie', icon: Images },
        ].map(({ href, label, icon: Icon, strong }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-2 text-xs font-medium">
            <span className={cn('grid size-[52px] place-items-center rounded-full', strong ? 'bg-deep text-cream' : 'bg-section text-deep')}>
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
