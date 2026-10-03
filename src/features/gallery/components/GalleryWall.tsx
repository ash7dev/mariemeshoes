'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, ImageOff, ShoppingBag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { addToCart } from '@/features/cart/store';
import { stockLine } from '@/features/shop/components/card-parts';
import type { PublicGalleryPost } from '../public-queries';

/** Glissement minimal (px) pour changer de photo au doigt. */
const SWIPE = 40;

/**
 * Le mur de la galerie : colonnes de hauteurs différentes, chaque photo dans son format,
 * l'étiquette de sa paire en bas. Toucher la photo l'ouvre en grand avec sa paire.
 */
export default function GalleryWall({ posts, size }: { posts: PublicGalleryPost[]; size: number | null }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul className="columns-2 gap-2.5 sm:columns-3 lg:columns-4 lg:gap-5">
        {posts.map((post, index) => {
          const { card } = post;
          const fits = card.stockInSize !== null && card.stockInSize > 0;
          return (
            <li key={post.id} className="relative mb-2.5 break-inside-avoid overflow-hidden rounded-[20px] bg-card lg:mb-5 lg:rounded-[24px]">
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-haspopup="dialog"
                aria-label={`Voir la photo : ${card.brand} ${card.model}`}
                className="block w-full"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.caption ?? `${card.brand} ${card.model} portée`}
                  width={post.width ?? 800}
                  height={post.height ?? 1000}
                  sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
                  className="h-auto w-full transition-transform duration-500 hover:scale-[1.02]"
                />
              </button>
              {/* L'étiquette de la paire : directement vers la fiche */}
              <Link
                href={card.href}
                className="absolute inset-x-[7px] bottom-[7px] flex items-center gap-1.5 rounded-[14px] bg-surface/95 py-[7px] pl-2.5 pr-[7px] shadow-[0_10px_24px_-14px_rgba(42,14,30,0.5)] backdrop-blur-sm lg:inset-x-2.5 lg:bottom-2.5 lg:gap-2.5 lg:rounded-[18px] lg:p-2"
              >
                <span className="relative hidden size-11 shrink-0 overflow-hidden rounded-xl border border-[#EFE8E0] bg-white lg:block">
                  {card.imageUrl && <Image src={card.imageUrl} alt="" fill sizes="44px" className="object-contain p-0.5" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="truncate text-xs lg:text-[0.8125rem]">{card.model}</strong>
                  <span className="truncate text-[0.6875rem] text-muted-ink lg:text-xs">
                    {formatFCFA(card.price)}
                    {fits && <span className="font-semibold text-[#1F6B3A]"> · en {size}</span>}
                  </span>
                </span>
                <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-full bg-deep text-cream lg:size-[34px]">
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                </span>
                <span className="sr-only">Voir la paire</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <PhotoDialog posts={posts} size={size} index={open} onIndexChange={setOpen} />
    </>
  );
}

function PhotoDialog({
  posts,
  size,
  index,
  onIndexChange,
}: {
  posts: PublicGalleryPost[];
  size: number | null;
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const open = index !== null;
  const post = index !== null ? posts[index] : null;
  const many = posts.length > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    // La page derrière ne défile pas tant que la photo est ouverte.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const go = (delta: number) => index !== null && onIndexChange((index + delta + posts.length) % posts.length);

  const card = post?.card;
  const mine = post && size !== null ? (post.sizes.find((s) => s.size === size) ?? null) : null;
  const low = card ? card.stockInSize !== null && card.stockInSize <= 2 : false;

  return (
    <dialog
      ref={dialogRef}
      aria-label={card ? `Photo : ${card.brand} ${card.model}` : 'Photo'}
      onClose={() => onIndexChange(null)}
      onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
      onKeyDown={(event) => {
        if (!many) return;
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-deep/85 lg:m-auto lg:h-auto lg:max-h-[90dvh] lg:w-[70rem] lg:max-w-[calc(100%-5rem)] lg:rounded-[36px]"
    >
      {post && card && (
        <div className="flex h-full flex-col overflow-y-auto bg-surface lg:grid lg:max-h-[90dvh] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden">
          {/* La photo */}
          <div
            className="relative h-[55dvh] shrink-0 bg-deep lg:h-auto lg:min-h-[40rem]"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null || !many) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
            }}
          >
            <Image key={post.imageUrl} src={post.imageUrl} alt={post.caption ?? `${card.brand} ${card.model} portée`} fill sizes="(min-width: 1024px) 640px, 100vw" className="object-contain" />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fermer"
              className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-surface text-deep lg:hidden"
            >
              <X className="size-5" strokeWidth={2} aria-hidden="true" />
            </button>
            {many && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface text-deep shadow-lg lg:left-[18px] lg:size-[52px]">
                  <ChevronLeft className="size-5" strokeWidth={2} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface text-deep shadow-lg lg:right-[18px] lg:size-[52px]">
                  <ChevronRight className="size-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {/* La paire sur la photo */}
          <div className="flex flex-col gap-4 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:gap-[18px] lg:overflow-y-auto lg:p-9">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold tracking-[0.22em] text-accent-ink">LA PAIRE SUR LA PHOTO</span>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Fermer"
                className="hidden size-11 place-items-center rounded-full bg-card transition-colors hover:bg-border lg:grid"
              >
                <X className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <Link href={card.href} className="relative block h-40 overflow-hidden rounded-3xl border border-[#EFE8E0] bg-white lg:h-[13rem]">
              {card.imageUrl ? (
                <Image src={card.imageUrl} alt="" fill sizes="(min-width: 1024px) 420px, 90vw" className="object-contain p-4" />
              ) : (
                <ImageOff className="absolute inset-0 m-auto size-6 text-muted" strokeWidth={1.4} aria-hidden="true" />
              )}
            </Link>
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-muted-ink">{card.brand}</span>
              <h2 className="font-display text-[2rem] leading-none lg:text-[2.5rem]">{card.model}</h2>
              <p className="text-[0.8125rem] text-muted-ink">{card.colorway}</p>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
                <span className={cn('text-[1.375rem] font-bold tabular-nums', card.struck !== null && 'text-accent-ink')}>{formatFCFA(card.price)}</span>
                {card.struck !== null && (
                  <span className="text-sm text-muted-ink line-through">
                    <span className="sr-only">au lieu de </span>
                    {formatFCFA(card.struck)}
                  </span>
                )}
                <span className={cn('text-[0.8125rem] font-semibold', low ? 'text-accent-ink' : 'text-[#1F6B3A]')}>{stockLine(card, size)}</span>
              </p>
            </div>
            {post.caption && <p className="text-[0.9375rem] italic leading-relaxed text-muted-ink">« {post.caption} »</p>}

            <div className="mt-auto flex flex-col gap-2.5 pt-2">
              {mine && added === mine.variantId ? (
                <Link href="/panier" className="flex h-14 items-center justify-center gap-2 rounded-full bg-deep text-[0.9375rem] font-bold text-cream">
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
                  className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25)] transition-transform active:scale-[0.98]"
                >
                  <ShoppingBag className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  Ajouter au panier · {size}
                </button>
              ) : (
                <Link href={card.href} className="flex h-14 items-center justify-center rounded-full bg-accent text-[0.9375rem] font-bold text-white">
                  {size === null ? 'Choisir ma pointure' : `Pas en ${size} · voir les pointures`}
                </Link>
              )}
              <Link href={card.href} className="flex h-[52px] items-center justify-center rounded-full border border-deep text-sm font-semibold transition-colors hover:bg-card">
                Voir la paire
              </Link>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
