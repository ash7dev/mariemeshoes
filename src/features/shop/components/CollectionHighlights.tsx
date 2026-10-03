'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ImageOff, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { addToCart } from '@/features/cart/store';
import type { CollectionHighlight } from '../collection-queries';

/**
 * Les incontournables d'une collection : ses premières paires mises en scène
 * (photo blanche en grand, numéro, mot de la collection), achat direct dans la pointure du client.
 */
export default function CollectionHighlights({ highlights, size }: { highlights: CollectionHighlight[]; size: number | null }) {
  const [added, setAdded] = useState<string | null>(null);

  return (
    <section aria-labelledby="highlights-title" className="flex flex-col gap-9 lg:gap-[72px]">
      <h2 id="highlights-title" className="px-1 text-[0.65625rem] font-bold tracking-[0.24em] text-muted-ink lg:px-0 lg:text-xs lg:tracking-[0.26em]">
        LES INCONTOURNABLES
      </h2>
      {highlights.map(({ card, note, sizes }, i) => {
        const mine = size === null ? null : (sizes.find((s) => s.size === size) ?? null);
        const isAdded = mine !== null && added === mine.variantId;
        const title = `${card.brand} ${card.model}, ${card.colorway}`;
        return (
          <article key={card.id} className={cn('flex flex-col gap-3.5 lg:items-center lg:gap-16', i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse')}>
            <Link
              href={card.href}
              tabIndex={-1}
              aria-hidden="true"
              className="group relative block h-[280px] overflow-hidden rounded-[30px] border border-[#EFE8E0] bg-white lg:h-[480px] lg:flex-[0_0_56%] lg:rounded-[40px]"
            >
              <span className="absolute left-4 top-2 z-10 font-display text-[4rem] leading-none text-transparent [-webkit-text-stroke:1.2px_#E2B9CB] lg:hidden">0{i + 1}</span>
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 700px, 92vw"
                  className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03] lg:p-10"
                />
              ) : (
                <span className="grid size-full place-items-center text-muted">
                  <ImageOff className="size-7" strokeWidth={1.4} />
                </span>
              )}
            </Link>

            <div className="flex flex-1 flex-col gap-2 px-1 lg:gap-4 lg:px-0">
              <span aria-hidden="true" className="hidden font-display text-[7.5rem] leading-[0.8] text-transparent [-webkit-text-stroke:1.5px_#E2B9CB] lg:block">
                0{i + 1}
              </span>
              <span className="text-[0.65625rem] font-bold uppercase tracking-[0.2em] text-muted-ink lg:text-xs lg:tracking-[0.22em]">{card.brand}</span>
              <h3 className="font-display text-[2.125rem] leading-none lg:text-[3.25rem] lg:leading-[0.98]">
                <Link href={card.href} className="hover:text-accent-ink">
                  {card.model}
                  <span className="sr-only">, {card.colorway}</span>
                </Link>
              </h3>
              {note && <p className="text-[0.90625rem] leading-relaxed text-muted-ink lg:text-base">{note}</p>}
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className={cn('text-lg font-bold tabular-nums lg:text-2xl', card.struck !== null && 'text-accent-ink')}>{formatFCFA(card.price)}</span>
                {card.struck && (
                  <span className="text-[0.8125rem] text-muted-ink line-through lg:text-sm">
                    <span className="sr-only">au lieu de </span>
                    {formatFCFA(card.struck)}
                  </span>
                )}
                <span className="text-[0.8125rem] text-muted-ink lg:text-sm">{card.colorway}</span>
              </p>
              <ul aria-label="Pointures en stock" className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <li
                    key={s.variantId}
                    className={cn(
                      'grid size-10 place-items-center rounded-full text-[0.8125rem] tabular-nums lg:size-11 lg:text-sm',
                      s.size === size ? 'bg-accent font-bold text-white' : 'border border-border bg-surface font-medium',
                    )}
                  >
                    {s.size}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex flex-wrap gap-2.5">
                {isAdded ? (
                  <Link href="/panier" className="flex h-[52px] items-center gap-2 rounded-full bg-deep px-6 text-[0.9375rem] font-bold text-cream lg:h-14">
                    <Check className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
                    Ajoutée · Voir le panier
                  </Link>
                ) : mine ? (
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(mine.variantId);
                      setAdded(mine.variantId);
                    }}
                    className="flex h-[52px] items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_18px_32px_-14px_rgba(230,0,126,0.8)] transition-transform active:scale-[0.98] lg:h-14"
                  >
                    <ShoppingBag className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    Ajouter au panier · {size}
                  </button>
                ) : (
                  <Link
                    href={card.href}
                    aria-label={size ? `Voir ${title}` : `Choisir ma pointure pour ${title}`}
                    className="flex h-[52px] items-center rounded-full bg-deep px-6 text-[0.9375rem] font-bold text-cream lg:h-14"
                  >
                    {size === null ? 'Choisir ma pointure' : `Pas en ${size} · voir la paire`}
                  </Link>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
