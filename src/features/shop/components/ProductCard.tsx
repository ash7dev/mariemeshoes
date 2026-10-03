import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopCard } from '../queries';
import { Badge, Price, ProductImage, Swatches } from './card-parts';

const MAX_SIZE_CHIPS = 7;
/** Carte compacte (bandeaux, Index des marques) : moins de pointures affichées. */
const MAX_SIZE_CHIPS_COMPACT = 5;

/**
 * Carte produit ordinateur : photo, marque et coloris, pointures en stock
 * (celle du client en magenta), prix et accès rapide.
 */
export default function ProductCard({ card, size, compact = false }: { card: ShopCard; size: number | null; compact?: boolean }) {
  const chips = card.sizes.slice(0, compact ? MAX_SIZE_CHIPS_COMPACT : MAX_SIZE_CHIPS);
  const more = card.sizes.length - chips.length;
  const title = `${card.brand} ${card.model}, ${card.colorway}`;

  return (
    <article className={cn('flex h-full flex-col overflow-hidden bg-card', compact ? 'rounded-[24px]' : 'rounded-[28px]')}>
      {/* Photo bord à bord sur blanc (le fond des photos), le sable seulement sous les infos. */}
      <Link
        href={card.href}
        tabIndex={-1}
        aria-hidden="true"
        className={cn('relative block overflow-hidden bg-white', compact ? 'h-[150px] lg:h-[170px]' : 'h-[240px]')}
      >
        <ProductImage
          src={card.imageUrl}
          sizes={compact ? '(min-width: 1024px) 240px, 200px' : '(min-width: 1280px) 300px, 25vw'}
          className={cn('transition-transform duration-300 hover:scale-105', compact ? 'p-2' : 'p-3')}
        />
        {card.badge && <Badge badge={card.badge} small={compact} onWhite className={cn('absolute', compact ? 'left-3 top-3' : 'left-4 top-4')} />}
      </Link>

      <div className={cn('flex flex-1 flex-col gap-1.5', compact ? 'px-4 pb-4 pt-3' : 'px-5 pb-5 pt-4')}>
        <div className="flex min-h-6 items-center justify-between gap-3">
          <span className="truncate text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-muted-ink">{card.brand}</span>
          <Swatches swatches={card.swatches} size="sm" />
        </div>
        <h3 className={cn('font-display leading-[1.15]', compact ? 'line-clamp-2 text-[1.125rem]' : 'text-[1.375rem]')}>
          <Link href={card.href} className="hover:text-accent-ink">
            {card.model}
            <span className="sr-only">, {card.colorway}</span>
          </Link>
        </h3>
        <p className="truncate text-[0.8125rem] text-muted-ink">{card.colorway}</p>

        <ul aria-label="Pointures en stock" className="mt-2 flex flex-wrap gap-[5px]">
          {chips.map((n) => (
            <li
              key={n}
              className={cn(
                'grid h-[26px] min-w-[30px] place-items-center rounded-lg px-1.5 text-xs',
                n === size ? 'bg-accent font-bold text-white' : 'bg-surface text-muted-ink',
              )}
            >
              {n}
            </li>
          ))}
          {more > 0 && <li className="grid h-[26px] place-items-center px-1 text-xs text-muted-ink">+{more}</li>}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <Price card={card} stacked />
          <Link
            href={card.href}
            aria-label={size ? `Voir ${title} en ${size}` : `Choisir ma pointure pour ${title}`}
            className={cn(
              'grid shrink-0 place-items-center rounded-full bg-deep text-cream transition-transform hover:scale-105 active:scale-95',
              compact ? 'size-11' : 'size-12',
            )}
          >
            <Plus className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
