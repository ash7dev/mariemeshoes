'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { addToCart } from '@/features/cart/store';
import type { DropSlide } from '../queries';

/** Glissement minimal (px) pour changer de paire au doigt. */
const SWIPE = 40;

/**
 * La scène de l'accueil : 4 paires au plus, une vitrine en arche, achat direct dans la pointure du client.
 * Scène aubergine, vitrine blanche comme le fond des photos : la paire s'y pose telle quelle.
 */
export default function DropStage({ title, slides, size }: { title: string; slides: DropSlide[]; size: number | null }) {
  const [index, setIndex] = useState(0);
  const [added, setAdded] = useState<string | null>(null);
  const touchX = useRef<number | null>(null);

  const slide = slides[index];
  const { card } = slide;
  const many = slides.length > 1;
  const mine = size === null ? null : (slide.sizes.find((s) => s.size === size) ?? null);
  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);

  const note =
    size === null
      ? slide.sizes.length === 1
        ? `en ${slide.sizes[0].size}`
        : `du ${slide.sizes[0].size} au ${slide.sizes[slide.sizes.length - 1].size}`
      : !mine
        ? `pas en ${size}`
        : mine.stock <= 2
          ? `plus que ${mine.stock} en ${size}`
          : `dispo en ${size}`;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label={title}
      className="mx-2 flex flex-col gap-3.5 rounded-[36px] bg-deep px-3.5 py-[18px] text-cream lg:mx-6 lg:mt-6 lg:gap-7 lg:rounded-[48px] lg:pb-10 lg:pl-14 lg:pr-10 lg:pt-8"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
      }}
    >
      {/* Titre, progression, compteur */}
      <div className="flex flex-col gap-3 px-1.5 lg:flex-row lg:items-center lg:gap-6 lg:px-0">
        {many && (
          <div aria-hidden="true" className="grid flex-1 gap-[5px] lg:gap-2" style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }}>
            {slides.map((s, i) => (
              <span key={s.card.id} className={cn('h-[3px] rounded-full', i < index ? 'bg-cream' : i === index ? 'bg-accent' : 'bg-deep-line')} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-6 lg:contents">
          <h2 className="flex items-center gap-3 whitespace-nowrap text-[0.65625rem] font-bold uppercase tracking-[0.22em] text-accent-soft lg:order-first lg:text-xs lg:tracking-[0.26em]">
            <span aria-hidden="true" className="hidden size-2.5 rounded-full bg-accent shadow-[0_0_0_6px_rgba(230,0,126,0.25)] lg:block" />
            {title}
          </h2>
          {many && (
            <span className="whitespace-nowrap font-display text-[0.9375rem] text-deep-ink lg:order-last lg:text-[1.375rem]">
              <span className="text-cream">{String(index + 1).padStart(2, '0')}</span> / {String(slides.length).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:items-stretch lg:gap-16 xl:gap-24">
        {/* Infos et achat */}
        <div className="order-2 flex flex-col gap-3.5 px-1.5 lg:order-1 lg:justify-between lg:gap-7 lg:px-0 lg:py-2" aria-live="polite">
          <div className="flex flex-col gap-1.5 lg:gap-3.5">
            <span className="flex items-center gap-2.5 text-[0.65625rem] font-bold uppercase tracking-[0.2em] text-deep-ink lg:text-xs lg:tracking-[0.22em]">
              {card.brand}
              <span className="rounded-full bg-deep-line px-2.5 py-1 text-[0.625rem] tracking-[0.12em] text-cream lg:text-[0.6875rem]">{slide.kicker}</span>
            </span>
            <h3 className="font-display text-[2.75rem] leading-[0.95] lg:text-[5rem] lg:leading-[0.92] lg:tracking-[-0.02em]">
              <Link href={card.href} className="hover:text-accent-soft">
                {card.model}
              </Link>
            </h3>
            <p className="text-[0.84375rem] text-deep-ink lg:text-base">{card.colorway}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mt-1.5">
              <span className="text-[1.3125rem] font-bold tabular-nums lg:text-[1.75rem]">{formatFCFA(card.price)}</span>
              {card.struck && (
                <span className="text-[0.8125rem] text-deep-ink line-through lg:text-[0.9375rem]">
                  <span className="sr-only">au lieu de </span>
                  {formatFCFA(card.struck)}
                </span>
              )}
            </p>
          </div>

          <div className="hidden flex-col gap-3 lg:flex">
            <p className="flex justify-between text-xs font-bold tracking-[0.2em] text-deep-ink">
              POINTURES EN STOCK <span className="tracking-[0.04em] text-accent-soft">{note}</span>
            </p>
            <ul className="grid grid-cols-6 gap-1.5">
              {slide.sizes.map((s) => (
                <li
                  key={s.variantId}
                  className={cn(
                    'grid h-11 place-items-center rounded-full text-sm font-semibold tabular-nums',
                    s.size === size ? 'bg-accent text-white' : 'border border-[#6B3A52]',
                  )}
                >
                  {s.size}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs font-semibold text-accent-soft lg:hidden">{note.charAt(0).toUpperCase() + note.slice(1)}</p>

          {many && (
            <div role="tablist" aria-label="Paires" className="grid grid-cols-4 gap-2 lg:flex lg:gap-3">
              {slides.map((s, i) => (
                <button
                  key={s.card.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${s.card.brand} ${s.card.model}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'relative grid h-[76px] place-items-center overflow-hidden rounded-[36px_36px_12px_12px] transition-opacity lg:h-[104px] lg:w-[84px] lg:rounded-[42px_42px_16px_16px]',
                    'bg-white',
                    i === index ? 'shadow-[0_0_0_3px_#2A0E1E,0_0_0_5px_#E6007E]' : 'hover:shadow-[0_0_0_3px_#2A0E1E,0_0_0_5px_#6B3A52]',
                  )}
                >
                  {s.card.imageUrl && <Image src={s.card.imageUrl} alt="" fill sizes="84px" className="object-contain p-1.5" />}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2.5">
            {mine && added === mine.variantId ? (
              <Link
                href="/panier"
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-cream text-[0.9375rem] font-bold text-deep lg:h-[60px]"
              >
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
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-accent text-[0.9375rem] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_20px_36px_-14px_rgba(230,0,126,0.8)] transition-transform active:scale-[0.98] lg:h-[60px]"
              >
                Ajouter au panier · {size}
              </button>
            ) : (
              <Link
                href={card.href}
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-accent text-[0.9375rem] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25)] lg:h-[60px]"
              >
                {size === null ? 'Choisir ma pointure' : 'Voir la paire'}
              </Link>
            )}
            {mine && (
              <Link href={card.href} className="hidden h-[60px] items-center rounded-full border border-[#6B3A52] px-6 text-sm font-semibold hover:border-cream lg:flex">
                Voir la fiche
              </Link>
            )}
          </div>
        </div>

        {/* La vitrine en arche */}
        <div
          className={cn(
            'relative order-1 mx-auto flex h-[400px] w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[170px_170px_26px_26px] bg-white lg:order-2 lg:h-[700px] lg:max-w-[600px] lg:rounded-[300px_300px_34px_34px]',
          )}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[160px_160px_18px_18px] border border-border/70 lg:inset-3.5 lg:rounded-[286px_286px_22px_22px]" />
          <span aria-hidden="true" className="absolute bottom-[118px] h-6 w-3/5 rounded-[50%] bg-[radial-gradient(closest-side,rgba(42,14,30,0.12),transparent)] lg:bottom-[200px] lg:h-10" />
          {card.imageUrl ? (
            // Photos recadrées sur la paire (marge de 8 %) : la paire tient dans l'arche sans agrandissement.
            <span className="relative aspect-[4/3] w-[92%] -rotate-6">
              <Image key={card.imageUrl} src={card.imageUrl} alt={card.imageAlt} fill priority={index === 0} sizes="(min-width: 1024px) 640px, 90vw" className="object-contain" />
            </span>
          ) : (
            <ImageOff className="relative size-8 text-section-ink" strokeWidth={1.4} aria-label="Pas encore de photo" />
          )}
          {card.discountPercent && (
            <span className="absolute right-[26px] top-[120px] grid size-16 rotate-12 place-items-center rounded-full bg-accent font-display text-[1.1875rem] text-white shadow-[0_16px_30px_-12px_rgba(230,0,126,0.7)] lg:right-16 lg:top-[210px] lg:size-[92px] lg:text-[1.75rem]">
              −{card.discountPercent} %
            </span>
          )}
          <span className="absolute bottom-[34px] left-7 hidden h-9 items-center gap-2 rounded-full bg-card px-3.5 text-[0.78125rem] font-semibold text-deep lg:flex">
            <span aria-hidden="true" className="size-[7px] rounded-full bg-[#1F6B3A]" />
            Neuve, dans sa boîte
          </span>
          {many && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Paire précédente"
                className="absolute bottom-3.5 left-3.5 grid size-[46px] place-items-center rounded-full border border-border bg-white text-deep lg:bottom-6 lg:left-auto lg:right-[90px] lg:size-14"
              >
                <ArrowLeft className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Paire suivante"
                className="absolute bottom-3.5 right-3.5 grid size-[46px] place-items-center rounded-full bg-deep text-cream lg:bottom-6 lg:right-6 lg:size-14"
              >
                <ArrowRight className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
