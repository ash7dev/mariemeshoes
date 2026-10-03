import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopCard } from '../queries';
import { Price, ProductImage, Swatches, stockLine } from './card-parts';

/** « Coup de cœur de la semaine » : grande carte rose thé, 2 colonnes × 2 rangées en tête de grille. */
export default function FeaturedCard({ card, size }: { card: ShopCard; size: number | null }) {
  const title = `${card.brand} ${card.model}, ${card.colorway}`;
  const low = card.stockInSize !== null && card.stockInSize <= 2;

  return (
    <article aria-labelledby="featured-title" className="relative col-span-2 row-span-2 flex min-h-[46rem] flex-col overflow-hidden rounded-[36px] bg-section p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="flex h-8 items-center rounded-full bg-deep px-3.5 text-xs font-semibold tracking-[0.06em] text-cream">Coup de cœur de la semaine</span>
        {card.discountPercent && (
          <span className="flex h-8 items-center rounded-full bg-accent px-3.5 text-[0.8125rem] font-bold text-white">−{card.discountPercent} %</span>
        )}
      </div>

      <Link href={card.href} tabIndex={-1} aria-hidden="true" className="relative my-4 flex flex-1 items-center justify-center">
        {/* Disque blanc (le fond des photos) qui rogne les coins de la photo inclinée. */}
        <span className="relative grid aspect-square w-[78%] max-w-[440px] place-items-center overflow-hidden rounded-full bg-white">
          <span className="relative block size-[92%] -rotate-[8deg]">
            <ProductImage src={card.imageUrl} sizes="(min-width: 1280px) 440px, 40vw" />
          </span>
        </span>
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-section-ink">{card.brand}</span>
          <h2 id="featured-title" className="font-display text-[2.75rem] leading-none text-deep">
            <Link href={card.href}>
              {card.model}
              <span className="sr-only">, {card.colorway}</span>
            </Link>
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <Swatches swatches={card.swatches} size="lg" ringClass="ring-offset-section" />
            <span className="truncate text-[0.84375rem] text-section-ink">{card.colorway}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[0.78125rem] text-section-ink">En stock</span>
            {card.sizes.slice(0, 8).map((n) => (
              <span
                key={n}
                className={cn(
                  'grid h-[30px] min-w-9 place-items-center rounded-[10px] px-1.5 text-[0.8125rem]',
                  n === size ? 'bg-accent font-bold text-white' : 'bg-surface text-muted-ink',
                )}
              >
                {n}
              </span>
            ))}
            {low && <span className="ml-1.5 text-[0.78125rem] font-semibold text-accent-ink">{stockLine(card, size)}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Price card={card} size="lg" />
          <Link
            href={card.href}
            aria-label={size ? `Voir ${title} en ${size}` : `Choisir ma pointure pour ${title}`}
            className="flex h-[58px] items-center gap-2.5 whitespace-nowrap rounded-full bg-deep px-7 text-[0.9375rem] font-semibold text-cream transition-transform hover:scale-[1.02] active:scale-95"
          >
            <ShoppingBag className="size-[19px]" strokeWidth={1.7} aria-hidden="true" />
            {size ? `Je la veux en ${size}` : 'Choisir ma pointure'}
          </Link>
        </div>
      </div>
    </article>
  );
}
