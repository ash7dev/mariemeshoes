'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, Check, ChevronLeft, ChevronRight, ImageOff, MessageCircle, Ruler, ShoppingBag, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { whatsappLink, whatsappSizeMessage } from '@/lib/whatsapp';
import { addToCart } from '@/features/cart/store';
import type { ProductPage } from '../queries';
import ProductLightbox from './ProductLightbox';

type ProductStageProps = {
  page: ProductPage;
  /** Pointure du client (cookie), présélectionnée si elle est en stock. */
  initialSize: number | null;
  whatsappNumber: string | null;
};

/**
 * « La Scène » : la paire en grand sur un disque blanc (le fond des photos), sur fond aubergine, avec
 * ses coloris, le choix de la pointure (stock par taille), la livraison et la commande.
 * « Ajouter au panier » garde la pointure choisie ; un message propose d'ouvrir le panier.
 */
export default function ProductStage({ page, initialSize, whatsappNumber }: ProductStageProps) {
  const { card } = page;
  const inStock = page.sizes.filter((s) => s.stock > 0);
  const soldOut = inStock.length === 0;
  const [size, setSize] = useState<number | null>(() => (initialSize !== null && inStock.some((s) => s.size === initialSize) ? initialSize : null));
  const [photo, setPhoto] = useState(0);
  const [added, setAdded] = useState<number | null>(null);
  // « Choisis ta pointure » cliqué sans pointure : le sélecteur s'illumine un instant.
  const [nudge, setNudge] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // Le message « ajoutée » disparaît tout seul.
  useEffect(() => {
    if (added === null) return;
    const timer = setTimeout(() => setAdded(null), 5000);
    return () => clearTimeout(timer);
  }, [added]);

  useEffect(() => {
    if (!nudge) return;
    const timer = setTimeout(() => setNudge(false), 1400);
    return () => clearTimeout(timer);
  }, [nudge]);

  const selected = page.sizes.find((s) => s.size === size) ?? null;
  const questionHref = whatsappLink(whatsappNumber, whatsappSizeMessage(`${card.brand} ${card.model}`, card.colorway, size ?? undefined));
  const stockLine = selected
    ? selected.stock <= 2
      ? `Plus que ${selected.stock} en ${selected.size}`
      : `En stock en ${selected.size}`
    : soldOut
      ? 'Épuisée dans toutes les pointures'
      : 'Choisis ta pointure';

  const images = page.images;
  const current = images[photo] ?? null;
  const go = (delta: number) => setPhoto((p) => (p + delta + images.length) % images.length);

  // Rendu deux fois (scène sur ordinateur, sous la scène sur mobile) : identifiants distincts.
  const sizePicker = (variant: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[26px] bg-cream p-[18px] text-ink transition-shadow duration-300 lg:rounded-[28px] lg:p-[22px]',
        nudge && 'shadow-[0_0_0_4px_#E6007E,0_0_0_10px_rgba(230,0,126,0.25)]',
      )}
    >
      <div className="flex items-baseline justify-between">
        <h2 id={`size-title-${variant}`} className="font-display text-[1.375rem] lg:text-2xl">
          Ta pointure
        </h2>
        <Link href="/guide-des-pointures" className="text-[0.78125rem] font-semibold text-accent-ink">
          Guide des pointures
        </Link>
      </div>
      {page.sizes.length === 0 ? (
        <p className="text-sm text-muted-ink">Aucune pointure en vente pour ce coloris.</p>
      ) : (
        <div role="radiogroup" aria-labelledby={`size-title-${variant}`} className="grid grid-cols-6 gap-1.5 lg:grid-cols-4">
          {page.sizes.map((s) => {
            const on = s.size === size;
            const out = s.stock === 0;
            return (
              <button
                key={s.size}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={out}
                aria-label={out ? `${s.size}, épuisée` : `${s.size}, ${s.stock} paire${s.stock > 1 ? 's' : ''}`}
                onClick={() => setSize(s.size)}
                className={cn(
                  'flex h-11 flex-col items-center justify-center rounded-[13px] text-[0.9375rem] transition-colors lg:h-[46px]',
                  on
                    ? 'bg-accent font-bold text-white'
                    : out
                      ? 'cursor-not-allowed border border-dashed border-[#D5CABE] text-muted line-through'
                      : 'border border-border bg-page font-medium hover:border-ink',
                )}
              >
                {s.size}
                {!out && s.stock <= 2 && (
                  <span className={cn('text-[0.5rem] font-bold leading-none no-underline', on ? 'text-[#FFE3F1]' : 'text-accent-ink')}>reste {s.stock}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <p className="flex items-start gap-2 text-[0.78125rem] leading-snug text-section-ink">
        <Ruler className="mt-px size-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span>
          {page.sizeAdvice ? `${page.sizeAdvice} · ` : ''}
          <span aria-live="polite" className={cn('font-semibold', selected && selected.stock <= 2 ? 'text-accent-ink' : '')}>
            {stockLine}
          </span>
        </span>
      </p>
    </div>
  );

  const orderButton =
    selected && selected.stock > 0 ? (
      <button
        type="button"
        onClick={() => {
          addToCart(selected.variantId);
          setAdded(selected.size);
        }}
        className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-accent px-6 text-[0.9375rem] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_20px_36px_-14px_rgba(230,0,126,0.8)] transition-transform active:scale-[0.98] lg:h-[62px] lg:flex-none lg:text-base"
      >
        <ShoppingBag className="size-5" strokeWidth={1.8} aria-hidden="true" />
        Ajouter au panier · {selected.size}
      </button>
    ) : (
      <button
        type="button"
        disabled={soldOut}
        onClick={() => {
          // Le titre visible (ordinateur ou mobile) : l'autre est masqué et n'a pas de hauteur.
          Array.from(document.querySelectorAll<HTMLElement>('[id^="size-title-"]'))
            .find((el) => el.offsetParent !== null)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setNudge(true);
        }}
        className="group flex h-14 flex-1 items-center gap-3 rounded-full border border-accent-soft/40 bg-accent/15 pl-1.5 pr-5 text-[0.9375rem] font-semibold text-cream transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50 lg:h-[62px] lg:flex-none lg:pl-2 lg:text-base"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white lg:size-[46px]">
          <Ruler className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">
          {soldOut ? (
            <>
              Épuisée<span className="hidden lg:inline"> dans toutes les pointures</span>
            </>
          ) : (
            'Choisis ta pointure'
          )}
        </span>
        {/* Sur ordinateur, le sélecteur est juste au-dessus du bouton. */}
        {!soldOut && <ArrowUp className="hidden size-[18px] shrink-0 text-accent-soft transition-transform group-hover:-translate-y-0.5 lg:block" strokeWidth={2} aria-hidden="true" />}
      </button>
    );

  return (
    <>
      <section
        aria-labelledby="product-title"
        className="relative mx-2 overflow-hidden rounded-[36px] bg-deep text-cream lg:mx-6 lg:mt-6 lg:rounded-[56px]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-9 left-[-12px] whitespace-nowrap font-display text-[8rem] leading-none text-[#33122A] lg:-bottom-[60px] lg:left-0 lg:right-0 lg:text-center lg:text-[16.25rem] lg:tracking-[-0.02em]"
        >
          {card.model}
        </span>

        <div className="relative mx-auto flex max-w-[80rem] flex-col gap-2.5 px-5 pb-[26px] pt-6 lg:grid lg:min-h-[47.5rem] lg:grid-cols-[330px_minmax(0,1fr)_330px] lg:gap-6 lg:px-0 lg:pb-14 lg:pt-12">
          {/* Identité */}
          <div className="flex flex-col justify-between gap-8">
            <div className="flex flex-col gap-2.5 lg:gap-3">
              <nav aria-label="Fil d’Ariane" className="hidden gap-2 text-[0.78125rem] text-deep-ink lg:flex">
                <Link href="/boutique" className="hover:text-cream">
                  Boutique
                </Link>
                <span aria-hidden="true">/</span>
                <Link href={`/boutique?marque=${page.brandSlug}`} className="hover:text-cream">
                  {card.brand}
                </Link>
              </nav>
              <Link href={`/boutique?marque=${page.brandSlug}`} className="text-[0.65625rem] font-bold uppercase tracking-[0.24em] text-accent-soft lg:mt-4 lg:text-[0.71875rem]">
                {card.brand}
              </Link>
              <h1 id="product-title" className="font-display text-[3rem] leading-[0.92] lg:text-[4.75rem]">
                {card.model}
              </h1>
              <p className="hidden text-[0.9375rem] text-deep-ink lg:block">{card.colorway}</p>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:mt-2.5">
                <span className="text-[1.375rem] font-bold tabular-nums lg:text-[2rem]">{formatFCFA(card.price)}</span>
                {card.struck && (
                  <span className="text-[0.8125rem] text-deep-ink line-through lg:text-[0.9375rem]">
                    <span className="sr-only">au lieu de </span>
                    {formatFCFA(card.struck)}
                  </span>
                )}
                {card.discountPercent && (
                  <span className="flex h-6 items-center rounded-full bg-accent px-2.5 text-[0.6875rem] font-bold lg:h-[30px] lg:px-3 lg:text-[0.78125rem]">
                    −{card.discountPercent} %
                  </span>
                )}
              </p>
            </div>
            {page.description && <p className="hidden text-[0.9375rem] leading-relaxed text-deep-ink lg:line-clamp-6 lg:block">{page.description}</p>}
          </div>

          {/* La paire et ses coloris */}
          <div className="relative flex flex-col items-center justify-center gap-7">
            <div className="relative grid size-[min(78vw,300px)] place-items-center lg:size-[480px]">
              {/* Disque blanc, comme le fond des photos ; il rogne les coins de la photo inclinée. */}
              <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white" />
              {current ? (
                <button
                  type="button"
                  onClick={() => setLightbox(true)}
                  aria-label="Agrandir la photo"
                  aria-haspopup="dialog"
                  className="absolute inset-0 grid cursor-zoom-in place-items-center overflow-hidden rounded-full"
                >
                  <span className="relative block size-[88%] -rotate-[8deg]">
                    <Image
                      key={current.url}
                      src={current.url}
                      alt={current.alt}
                      fill
                      priority={photo === 0}
                      sizes="(min-width: 1024px) 420px, 70vw"
                      className="object-contain transition-transform duration-300 hover:scale-105"
                    />
                  </span>
                </button>
              ) : (
                <ImageOff className="relative size-8 text-section-ink" strokeWidth={1.4} aria-label="Pas encore de photo" />
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Photo précédente"
                    className="absolute left-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-cream text-deep shadow-lg lg:-left-6 lg:size-12"
                  >
                    <ChevronLeft className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Photo suivante"
                    className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-cream text-deep shadow-lg lg:-right-6 lg:size-12"
                  >
                    <ChevronRight className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5" aria-label={`Photo ${photo + 1} sur ${images.length}`}>
                    {images.map((image, i) => (
                      <span key={image.url} aria-hidden="true" className={cn('h-1.5 rounded-full transition-all', i === photo ? 'w-5 bg-cream' : 'w-1.5 bg-[#6B3A52]')} />
                    ))}
                  </span>
                </>
              )}
            </div>

            {page.colorways.length > 1 && (
              <nav aria-label="Coloris" className="relative flex max-w-full gap-3 overflow-x-auto rounded-full bg-deep-line px-3 py-2 [scrollbar-width:none] lg:gap-[18px] lg:px-3.5 lg:py-2.5">
                {page.colorways.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/produits/${c.slug}`}
                    aria-current={c.current ? 'page' : undefined}
                    scroll={false}
                    className="flex shrink-0 flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        'relative block size-10 overflow-hidden rounded-full bg-card lg:size-[54px]',
                        c.current && 'ring-2 ring-cream ring-offset-[3px] ring-offset-deep-line',
                        c.soldOut && !c.current && 'opacity-50',
                      )}
                    >
                      {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="54px" className="scale-[1.5] object-contain mix-blend-multiply" />}
                    </span>
                    <span className={cn('hidden max-w-[5.5rem] truncate text-[0.6875rem] font-semibold lg:block', c.current ? 'text-cream' : 'text-[#B79BAA]')}>
                      {c.name}
                    </span>
                    <span className="sr-only">
                      {c.name}
                      {c.soldOut ? ', épuisé' : ''}
                    </span>
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Achat (ordinateur) */}
          <div className="hidden flex-col justify-center gap-3 lg:flex">
            {sizePicker('desktop')}
            {page.delivery && (
              <p className="flex items-center gap-3.5 rounded-[22px] bg-deep-line px-5 py-4">
                <Truck className="size-[22px] shrink-0 text-accent-soft" strokeWidth={1.7} aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <strong className="text-sm">
                    Livraison {page.delivery.zone}
                    {page.delivery.delay ? ` en ${page.delivery.delay}` : ''}
                  </strong>
                  <span className="text-[0.78125rem] text-deep-ink">{formatFCFA(page.delivery.fee)} · Wave ou à la livraison</span>
                </span>
              </p>
            )}
            {orderButton}
            {questionHref && (
              <a
                href={questionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#6B3A52] text-sm font-semibold transition-colors hover:border-cream"
              >
                <MessageCircle className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
                Une question ? WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Achat (mobile) : la pointure sous la scène, la commande dans la barre fixe */}
      <div className="relative z-10 mx-5 -mt-6 flex flex-col gap-3 lg:hidden">
        <div className="rounded-[26px] border border-border shadow-[0_24px_44px_-28px_rgba(42,14,30,0.45)]">{sizePicker('mobile')}</div>
        {page.delivery && (
          <p className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 text-sm">
            <Truck className="size-5 shrink-0 text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
            <span>
              <strong>Livraison {page.delivery.zone}</strong>
              {page.delivery.delay ? ` en ${page.delivery.delay}` : ''} · {formatFCFA(page.delivery.fee)}
              <span className="block text-[0.78125rem] text-muted-ink">Wave ou paiement à la livraison</span>
            </span>
          </p>
        )}
        {questionHref && (
          <a href={questionHref} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold">
            <MessageCircle className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
            Une question sur la pointure ?
          </a>
        )}
        {page.description && <p className="pt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{page.description}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 bg-deep px-3 pb-[max(22px,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <span className="flex flex-col pl-2 text-cream">
          <span className="text-[0.71875rem] text-deep-ink">{size !== null ? `Pointure ${size}` : 'Pointure ?'}</span>
          <strong className="text-base tabular-nums">{formatFCFA(card.price)}</strong>
        </span>
        {orderButton}
      </div>

      <ProductLightbox
        images={images}
        index={photo}
        open={lightbox}
        title={`${card.brand} ${card.model}`}
        onIndexChange={setPhoto}
        onClose={() => setLightbox(false)}
      />

      {added !== null && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[104px] z-50 flex items-center justify-between gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-sm text-cream shadow-lg lg:inset-x-auto lg:bottom-auto lg:right-8 lg:top-28 lg:gap-4 lg:pl-5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Check className="size-4 shrink-0 text-accent-soft" strokeWidth={2.4} aria-hidden="true" />
            <span className="truncate">Ajoutée au panier · pointure {added}</span>
          </span>
          <Link href="/panier" className="flex h-10 shrink-0 items-center rounded-full bg-cream px-4 text-[0.8125rem] font-bold text-ink">
            Voir le panier
          </Link>
        </div>
      )}
    </>
  );
}
