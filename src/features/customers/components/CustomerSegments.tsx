import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CUSTOMER_SEGMENT_LABEL, CUSTOMER_SEGMENTS, type CustomerSegment } from '../queries';

export default function CustomerSegments({
  current,
  counts,
  hrefs,
}: {
  current: CustomerSegment;
  counts: Record<CustomerSegment, number>;
  hrefs: Record<CustomerSegment, string>;
}) {
  return (
    <nav aria-label="Segments de clients" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-card p-1">
        {CUSTOMER_SEGMENTS.map((segment) => {
          const active = segment === current;
          return (
            <li key={segment}>
              <Link
                href={hrefs[segment]}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors',
                  active ? 'bg-surface text-ink shadow-sm' : 'text-muted-ink hover:text-ink',
                )}
              >
                {CUSTOMER_SEGMENT_LABEL[segment]}
                <span className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums', active ? 'bg-card text-ink' : 'bg-surface/70 text-muted-ink')}>
                  {counts[segment]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
