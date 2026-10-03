import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardData } from '../queries';
import { compact, money, num, signedPercent, trendOf } from '../format';

const TREND_ON_DARK = {
  up: 'bg-[#9BC27A]/20 text-[#C4DDAE]',
  down: 'bg-[#E07A5F]/20 text-[#F2B8A8]',
  flat: 'bg-cream/10 text-cream/80',
};

/** Hauteur utile des barres : le haut droit reste libre pour la bulle « Aujourd'hui ». */
const BAR_ZONE = 0.68;

/**
 * Chiffre d'affaires de la période (repris de MAT) : montant, comparaison à date,
 * répartition, et barres empilées par jour (ou mois) — encaissé en rose, en attente
 * en rose pâle, aujourd'hui en crème, jours à venir en fantôme.
 */
export default function RevenueHero({ data }: { data: DashboardData }) {
  const { revenue, period } = data;
  const series = revenue.series;
  const empty = revenue.revenue === 0;
  const max = Math.max(1, ...series.map((b) => b.paid + b.pending), revenue.averagePerBucket);
  const scale = (v: number) => (v / max) * BAR_ZONE * 100;
  const trend = trendOf(revenue.change);
  const current = series.find((b) => b.isCurrent);
  const gap = series.length > 12 ? 6 : 14;
  const showLabel = (i: number) => series.length <= 12 || [0, 7, 14, 21, series.length - 1].includes(i);
  const chartLabel = empty
    ? 'Aucune vente sur la période'
    : `Chiffre d’affaires par ${period.bucket === 'day' ? 'jour' : 'mois'} : ${series
        .filter((b) => !b.isFuture && b.paid + b.pending > 0)
        .map((b) => `${b.fullLabel} ${money(b.paid + b.pending)}`)
        .join(', ')}`;

  const bubble = current &&
    !current.isFuture && {
      title: period.bucket === 'day' ? 'Aujourd’hui' : 'Ce mois-ci',
      amount: period.bucket === 'day' ? revenue.today.revenue : current.paid + current.pending,
      detail:
        period.bucket === 'day'
          ? revenue.today.pending > 0
            ? `dont ${money(revenue.today.pending)} en attente`
            : `${revenue.today.orders} commande${revenue.today.orders > 1 ? 's' : ''}`
          : `${current.orders} commande${current.orders > 1 ? 's' : ''}`,
      warn: period.bucket === 'day' && revenue.today.pending > 0,
    };

  return (
    <section aria-labelledby="revenue-title" className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-[32px] bg-deep p-7 text-cream xl:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full border border-accent-soft/15" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-16 size-64 rounded-full border border-accent-soft/10" />

      <div className="relative flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 id="revenue-title" className="text-[0.6875rem] font-medium tracking-[0.24em] text-accent-soft">
            CHIFFRE D’AFFAIRES · {period.label.toUpperCase()}
          </h2>
          <p className="flex items-baseline gap-3 whitespace-nowrap">
            <span className="font-display text-[3.5rem] leading-[0.9] tabular-nums xl:text-[4rem]">{num(revenue.revenue)}</span>
            <span className="text-lg text-cream/75">FCFA</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.8125rem]">
            {revenue.change !== null && (
              <span className={cn('inline-flex h-[26px] items-center whitespace-nowrap rounded-full px-2.5 font-semibold tabular-nums', TREND_ON_DARK[trend])}>
                {trend === 'up' ? '↗ ' : trend === 'down' ? '↘ ' : ''}
                {signedPercent(revenue.change)}
              </span>
            )}
            <span className="whitespace-nowrap text-cream/75">
              {period.compareLabel} · {money(revenue.prevRevenue)}
            </span>
          </p>
        </div>

        <dl className="flex items-stretch gap-6 pt-1">
          {[
            { label: 'Encaissé', value: num(revenue.paid), className: '' },
            { label: 'En attente', value: num(revenue.pending), className: 'text-accent-soft' },
            { label: 'Remises', value: revenue.discounts ? `−${num(revenue.discounts)}` : '0', className: '' },
          ].map((s, i) => (
            <div key={s.label} className={cn('flex flex-col gap-1.5', i > 0 && 'border-l border-cream/18 pl-6')}>
              <dt className="whitespace-nowrap text-xs text-cream/70">{s.label}</dt>
              <dd className={cn('whitespace-nowrap text-xl font-semibold tabular-nums', s.className)}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative flex flex-col gap-3">
        <div role="img" aria-label={chartLabel} className="relative h-[220px]">
          {!empty && revenue.averagePerBucket > 0 && (
            <>
              <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-cream/30" style={{ bottom: `${scale(revenue.averagePerBucket)}%` }} />
              <span aria-hidden="true" className="absolute left-0 whitespace-nowrap text-[0.6875rem] text-cream/70" style={{ bottom: `calc(${scale(revenue.averagePerBucket)}% + 6px)` }}>
                moyenne {compact(revenue.averagePerBucket)} / {period.bucket === 'day' ? 'jour' : 'mois'}
              </span>
            </>
          )}

          <div className="absolute inset-0 grid items-end" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`, gap }}>
            {series.map((b, i) => {
              const total = b.paid + b.pending;
              // État vide : une vague de barres fantômes, pour montrer la forme à venir.
              const ghost = empty ? 10 + 18 * (0.5 + 0.5 * Math.sin(i * 0.7)) : 0;
              return (
                <div
                  key={b.key}
                  title={b.isFuture || empty ? b.fullLabel : `${b.fullLabel} · ${money(total)}${b.pending ? ` (dont ${money(b.pending)} en attente)` : ''} · ${b.orders} commande${b.orders > 1 ? 's' : ''}`}
                  className="flex h-full flex-col justify-end"
                >
                  {empty ? (
                    <span className="block rounded-md bg-cream/[0.07]" style={{ height: `${ghost}%` }} />
                  ) : b.isFuture || total === 0 ? (
                    <span className={cn('block h-1.5 rounded-full', b.isFuture ? 'bg-cream/8' : 'bg-cream/18')} />
                  ) : (
                    <span className="flex flex-col gap-0.5" style={{ height: `${Math.max(scale(total), 2)}%` }}>
                      {b.pending > 0 && <span className="block min-h-1 rounded-b-[3px] rounded-t-md bg-accent-soft/35" style={{ flexGrow: b.pending }} />}
                      {b.paid > 0 && (
                        <span
                          className={cn('block min-h-1', b.pending > 0 ? 'rounded-b-md rounded-t-[3px]' : 'rounded-md', b.isCurrent ? 'bg-cream' : 'bg-accent-soft')}
                          style={{ flexGrow: b.paid }}
                        />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {empty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-cream/10 text-accent-soft ring-1 ring-cream/15">
                <BarChart3 className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <p className="font-display text-[1.25rem]">Tes ventes s’afficheront ici</p>
              <p className="max-w-sm text-[0.8125rem] text-cream/70">
                Une barre par {period.bucket === 'day' ? 'jour' : 'mois'} : encaissé en rose, en attente en rose pâle.
              </p>
            </div>
          ) : (
            bubble && (
              <div className="absolute right-0 top-0 flex flex-col gap-0.5 rounded-2xl bg-cream px-4 py-2.5 text-ink shadow-[0_10px_30px_rgb(0_0_0/0.25)]">
                <span className="text-[0.6875rem] text-muted-ink">{bubble.title}</span>
                <span className="whitespace-nowrap text-base font-bold tabular-nums">{money(bubble.amount)}</span>
                <span className={cn('whitespace-nowrap text-[0.6875rem] font-semibold', bubble.warn ? 'text-accent-ink' : 'text-[#1F6B3A]')}>{bubble.detail}</span>
              </div>
            )
          )}
        </div>

        <div className="grid text-[0.6875rem] text-cream/70" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`, gap }}>
          {series.map((b, i) => (
            <span key={b.key} className={cn('whitespace-nowrap text-center', b.isCurrent && 'font-semibold text-cream')}>
              {showLabel(i) ? b.label : ''}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-cream/75">
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-accent-soft" />Encaissé</span>
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-accent-soft/35" />En attente (Wave à vérifier, paiement à la livraison)</span>
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-cream" />{period.bucket === 'day' ? 'Aujourd’hui' : 'Mois en cours'}</span>
          {revenue.delivery > 0 && <span className="ml-auto whitespace-nowrap">livraison incluse · {money(revenue.delivery)}</span>}
        </div>
      </div>
    </section>
  );
}
