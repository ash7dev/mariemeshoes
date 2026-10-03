import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ShopCard } from '../queries';
import { Badge, Price, ProductImage, stockLine } from './card-parts';

/**
 * Petite carte mobile, deux par ligne (suggestions sous une fiche produit) :
 * photo blanche bord à bord, modèle, prix et disponibilité. Toute la carte est un lien.
 */
export default function ProductCardMini({ card, size }: { card: ShopCard; size: number | null }) {
  const badge = card.badge && (card.badge.tone === 'promo' || card.badge.label === 'Nouveau') ? card.badge : null;
  const low = card.stockInSize !== null && card.stockInSize <= 2;

  return (
    <Link href={card.href} className="flex h-full flex-col overflow-hidden rounded-[22px] bg-card transition-transform active:scale-[0.98]">
      <span className="relative block h-[150px] bg-white">
        <ProductImage src={card.imageUrl} sizes="45vw" className="p-2.5" />
        {badge && <Badge badge={badge} small onWhite className="absolute left-2.5 top-2.5" />}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3 pt-2.5">
        <span className="truncate text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-ink">{card.brand}</span>
        <span className="line-clamp-2 font-display text-[1.0625rem] leading-[1.15]">
          {card.model}
          <span className="sr-only">, {card.colorway}</span>
        </span>
        <span className="mt-auto pt-1.5">
          <Price card={card} stacked />
        </span>
        <span className={cn('flex items-center gap-1.5 text-[0.6875rem] font-semibold', low ? 'text-accent-ink' : 'text-[#1F6B3A]')}>
          <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', low ? 'bg-accent' : 'bg-[#1F8A4C]')} />
          <span className="truncate">{stockLine(card, size)}</span>
        </span>
      </span>
    </Link>
  );
}
