import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  buildHref: (page: number) => string;
};

/** Pagination : « 21–40 sur 57 », précédent / suivant. Masquée s'il n'y a qu'une page. */
export default function Pagination({ page, pageCount, total, perPage, buildHref }: PaginationProps) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const button = (target: number, disabled: boolean, label: string, children: React.ReactNode) =>
    disabled ? (
      <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-border text-muted opacity-50">
        {children}
      </span>
    ) : (
      <Link href={buildHref(target)} aria-label={label} className="grid size-11 place-items-center rounded-full border border-border hover:border-ink">
        {children}
      </Link>
    );

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-ink">
        <span className="tabular-nums">
          {from}–{to}
        </span>{' '}
        sur <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {button(page - 1, page <= 1, 'Page précédente', <ChevronLeft className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />)}
        <span className={cn('min-w-16 text-center text-sm tabular-nums')}>
          {page} / {pageCount}
        </span>
        {button(page + 1, page >= pageCount, 'Page suivante', <ChevronRight className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />)}
      </div>
    </nav>
  );
}
