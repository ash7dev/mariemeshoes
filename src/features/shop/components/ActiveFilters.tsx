'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { setShoeSize } from '@/features/size/SizeProvider';

type ActiveFiltersProps = {
  size: number | null;
  chips: Array<{ label: string; href: string }>;
  clearHref: string;
};

const chipClass = 'flex h-[34px] items-center gap-2 rounded-full pl-3.5 pr-2.5 text-[0.8125rem] font-semibold transition-opacity hover:opacity-80';

/** Filtres en cours, chacun retirable ; « Tout effacer » garde la pointure (elle vaut pour tout le site). */
export default function ActiveFilters({ size, chips, clearHref }: ActiveFiltersProps) {
  if (size === null && chips.length === 0) return <div className="h-[30px]" />;

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-1 pb-[30px] pt-[18px]">
      {size !== null && (
        <button type="button" onClick={() => setShoeSize(null)} aria-label={`Retirer la pointure ${size}`} className={`${chipClass} bg-section text-section-ink`}>
          Pointure {size}
          <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </button>
      )}
      {chips.map((chip) => (
        <Link key={chip.href} href={chip.href} scroll={false} aria-label={`Retirer le filtre ${chip.label}`} className={`${chipClass} bg-card text-ink`}>
          {chip.label}
          <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </Link>
      ))}
      {chips.length > 0 && (
        <Link href={clearHref} scroll={false} className="h-[34px] px-2 text-[0.8125rem] font-semibold leading-[34px] text-accent-ink underline underline-offset-[3px]">
          Tout effacer
        </Link>
      )}
    </div>
  );
}
