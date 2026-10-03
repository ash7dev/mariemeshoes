'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setShoeSize } from '@/features/size/SizeProvider';
import { ADULT_SIZES, KID_SIZES } from '@/features/size/sizes';
import type { SizeCount } from '../queries';

type SizeRibbonProps = {
  size: number | null;
  counts: SizeCount[];
  variant: 'desktop' | 'mobile';
};

/**
 * Ruban rose thé des pointures : chaque pointure avec son nombre de modèles disponibles.
 * Toucher une pointure la choisit pour tout le site ; toucher la pointure choisie la retire.
 */
export default function SizeRibbon({ size, counts, variant }: SizeRibbonProps) {
  const [kids, setKids] = useState(size !== null && size < 36);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const byId = new Map(counts.map((c) => [c.size, c.count]));
  const sizes = kids ? KID_SIZES : ADULT_SIZES;
  const mobile = variant === 'mobile';

  // Mobile : la pointure choisie est centrée dans le ruban.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const selected = scroller?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!scroller || !selected) return;
    scroller.scrollLeft = selected.offsetLeft - scroller.clientWidth / 2 + selected.clientWidth / 2;
  }, [size, kids]);

  const groupToggle = (
    <button
      type="button"
      onClick={() => setKids((k) => !k)}
      className={cn(
        'shrink-0 transition-opacity hover:opacity-90',
        mobile
          ? 'flex h-11 items-center gap-1 text-[0.78125rem] font-semibold text-section-ink'
          : 'flex h-[74px] flex-col justify-center gap-[3px] rounded-full bg-deep px-[22px] text-left text-cream',
      )}
    >
      {mobile ? (
        <>
          {kids ? 'Adulte' : 'Enfant'}
          <ChevronRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="text-[0.8125rem] font-semibold">{kids ? 'Adulte' : 'Enfant'}</span>
          <span className="text-[0.6875rem] text-deep-ink">{kids ? '36 à 46 ›' : '16 à 35 ›'}</span>
        </>
      )}
    </button>
  );

  const pills = (
    <div
      ref={scrollerRef}
      role="group"
      aria-label="Pointure"
      className={cn(
        'flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        mobile ? 'pr-4' : cn('min-w-0 flex-1 p-1', kids ? 'justify-start' : 'justify-between'),
      )}
    >
      {sizes.map((n) => {
        const count = byId.get(n) ?? 0;
        const selected = n === size;
        const out = count === 0 && !selected;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={selected}
            disabled={out}
            aria-label={selected ? `Pointure ${n}, choisie. Retirer` : `Pointure ${n}, ${count} modèle${count > 1 ? 's' : ''}`}
            onClick={() => setShoeSize(selected ? null : n)}
            className={cn(
              'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-full transition-[background-color,transform] active:scale-95',
              mobile ? 'size-14' : 'size-[74px]',
              selected
                ? 'bg-accent text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_14px_26px_-12px_rgba(230,0,126,0.8)]'
                : out
                  ? 'cursor-default border-[1.5px] border-dashed border-[#C9A9B8] text-section-ink'
                  : 'bg-surface text-deep hover:bg-white',
            )}
          >
            <span className={cn('font-display leading-none', mobile ? 'text-xl' : 'text-[1.5rem]', out && 'line-through')}>{n}</span>
            <span className={cn('font-semibold', mobile ? 'text-[0.5625rem]' : 'text-[0.625rem]', selected ? 'font-bold' : 'text-section-ink')}>
              {out ? 'bientôt' : selected && !mobile ? `${count} modèle${count > 1 ? 's' : ''}` : count}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (mobile) {
    return (
      <section aria-labelledby="ribbon-title-mobile" className="flex flex-col gap-2.5 overflow-hidden rounded-[28px] bg-section py-3.5 pl-4">
        <div className="flex items-center justify-between pr-4">
          <h2 id="ribbon-title-mobile" className="text-[0.65625rem] font-bold tracking-[0.22em] text-section-ink">
            {size ? 'TA POINTURE' : 'CHOISIS TA POINTURE'}
          </h2>
          {groupToggle}
        </div>
        {pills}
      </section>
    );
  }

  return (
    <section aria-labelledby="ribbon-title" className="flex items-center gap-7 rounded-[36px] bg-section py-[18px] pl-[30px] pr-[18px]">
      <div className="flex w-[170px] shrink-0 flex-col gap-1.5">
        <h2 id="ribbon-title" className="text-[0.6875rem] font-bold tracking-[0.24em] text-section-ink">
          {size ? 'TA POINTURE' : 'CHOISIS TA POINTURE'}
        </h2>
        <p className="font-display text-[1.375rem] leading-[1.15] text-deep">On n&apos;affiche que ce qui t&apos;ira.</p>
      </div>
      {pills}
      {groupToggle}
    </section>
  );
}
