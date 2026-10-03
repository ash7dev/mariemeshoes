import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopCard } from '../queries';
import { Badge, Price, ProductImage, Swatches, stockLine } from './card-parts';

/**
 * Grande carte mobile, une par ligne : photo large, coloris en vignettes,
 * disponibilité dans la pointure du client et accès direct.
 */
export default function ProductCardMobile({ card, size }: { card: ShopCard; size: number | null }) {
  const title = `${card.brand} ${card.model}, ${card.colorway}`;
  // Le stock bas est déjà dit sous le prix : en haut, seulement promo et nouveauté.
  const badge = card.badge && (card.badge.tone === 'promo' || card.badge.label === 'Nouveau') ? card.badge : null;
  const low = card.stockInSize !== null && card.stockInSize <= 2;

  return (
    <article className="flex flex-col overflow-hidden rounded-[30px] bg-card">
      {/* Photo bord à bord sur blanc (le fond des photos), le sable seulement sous les infos. */}
      <Link href={card.href} tabIndex={-1} aria-hidden="true" className="relative block h-[230px] bg-white">
        <ProductImage src={card.imageUrl} sizes="(max-width: 640px) 100vw, 420px" className="p-3" />
        {badge && <Badge badge={badge} small onWhite className="absolute left-4 top-4" />}
      </Link>

      <div className="flex flex-col gap-3 p-[18px] pt-4">
        <span className="truncate text-[0.65625rem] font-bold uppercase tracking-[0.2em] text-muted-ink">{card.brand}</span>

        {card.swatches.length > 1 ? (
          <div className="flex items-center gap-3">
            <Swatches swatches={card.swatches} size="lg" />
            <span className="min-w-0 truncate text-[0.78125rem] text-muted-ink">{card.colorway}</span>
          </div>
        ) : (
          <p className="truncate text-[0.78125rem] text-muted-ink">{card.colorway}</p>
        )}

        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-display text-[1.625rem] leading-[1.05]">
              <Link href={card.href}>
                {card.model}
                <span className="sr-only">, {card.colorway}</span>
              </Link>
            </h3>
            <Price card={card} />
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', low ? 'text-accent-ink' : 'text-[#1F6B3A]')}>
              <span aria-hidden="true" className={cn('size-[7px] rounded-full', low ? 'bg-accent' : 'bg-[#1F8A4C]')} />
              {stockLine(card, size)}
            </span>
          </div>
          <Link
            href={card.href}
            aria-label={size ? `Voir ${title} en ${size}` : `Choisir ma pointure pour ${title}`}
            className="flex h-[52px] shrink-0 items-center gap-2 rounded-full bg-deep px-[18px] text-sm font-semibold text-cream transition-transform active:scale-95"
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
            {size ? `En ${size}` : 'Voir'}
          </Link>
        </div>
      </div>
    </article>
  );
}
