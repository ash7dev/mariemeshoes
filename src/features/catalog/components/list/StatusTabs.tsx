import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ProductStatusFilter } from '../../list-queries';

const LABELS: Record<ProductStatusFilter, string> = {
  tous: 'Tous',
  'en-ligne': 'En ligne',
  brouillons: 'Brouillons',
  'stock-bas': 'Stock bas',
};

type StatusTabsProps = {
  current: ProductStatusFilter;
  counts: Record<ProductStatusFilter, number>;
  hrefs: Record<ProductStatusFilter, string>;
};

/** Onglets de statut avec compteurs (même rail segmenté que les filtres). */
export default function StatusTabs({ current, counts, hrefs }: StatusTabsProps) {
  return (
    <nav aria-label="Statut des produits" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-card p-1">
        {(Object.keys(LABELS) as ProductStatusFilter[]).map((status) => {
          const active = status === current;
          const alert = status === 'stock-bas' && counts[status] > 0;
          return (
            <li key={status}>
              <Link
                href={hrefs[status]}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
                  active ? 'bg-surface text-ink shadow-sm' : 'text-muted-ink hover:text-ink',
                )}
              >
                {LABELS[status]}
                <span
                  className={cn(
                    'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums',
                    alert ? 'bg-accent text-white' : active ? 'bg-card text-ink' : 'bg-surface/70 text-muted-ink',
                  )}
                >
                  {counts[status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
