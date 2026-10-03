import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PROMOTION_TAB_LABEL, PROMOTION_TABS, type PromotionTab } from '../../list-queries';

export default function PromotionTabs({ current, counts, hrefs }: { current: PromotionTab; counts: Record<PromotionTab, number>; hrefs: Record<PromotionTab, string> }) {
  return (
    <nav aria-label="Statut des promotions" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-card p-1">
        {PROMOTION_TABS.map((tab) => {
          const active = tab === current;
          const live = tab === 'en-cours' && counts[tab] > 0;
          return (
            <li key={tab}>
              <Link
                href={hrefs[tab]}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors',
                  active ? 'bg-surface text-ink shadow-sm' : 'text-muted-ink hover:text-ink',
                )}
              >
                {PROMOTION_TAB_LABEL[tab]}
                <span
                  className={cn(
                    'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums',
                    live ? 'bg-accent text-white' : active ? 'bg-card text-ink' : 'bg-surface/70 text-muted-ink',
                  )}
                >
                  {counts[tab]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
