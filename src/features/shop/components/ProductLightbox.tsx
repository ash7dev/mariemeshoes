'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductPageImage } from '../queries';

/** Agrandissement au clic sur la photo. */
const ZOOM = 2.2;
/** Glissement minimal (px) pour changer de photo au doigt. */
const SWIPE = 40;

type ProductLightboxProps = {
  images: ProductPageImage[];
  index: number;
  open: boolean;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/**
 * Visionneuse plein écran des photos d'un coloris : fond blanc comme les photos,
 * flèches (et ← → au clavier), vignettes, glissement au doigt, zoom au clic qui suit la souris.
 */
export default function ProductLightbox({ images, index, open, title, onIndexChange, onClose }: ProductLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  const current = images[index] ?? null;
  const many = images.length > 1;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    // La page derrière ne défile pas tant que la visionneuse est ouverte.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const go = (delta: number) => {
    setZoomed(false);
    onIndexChange((index + delta + images.length) % images.length);
  };

  const pointAt = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Photos : ${title}`}
      onClose={() => {
        setZoomed(false);
        onClose();
      }}
      onKeyDown={(event) => {
        if (!many) return;
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 text-ink backdrop:bg-deep/80"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8 lg:py-5">
          <p className="flex min-w-0 items-baseline gap-3">
            <span className="truncate font-display text-xl lg:text-[1.75rem]">{title}</span>
            {many && (
              <span className="shrink-0 text-sm tabular-nums text-muted-ink">
                {index + 1} / {images.length}
              </span>
            )}
          </p>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Fermer" className="grid size-11 shrink-0 place-items-center rounded-full bg-card transition-colors hover:bg-border lg:size-12">
            <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div
          className="relative min-h-0 flex-1 overflow-hidden"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null || zoomed || !many) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
          }}
        >
          {current && (
            <button
              type="button"
              onClick={(event) => {
                pointAt(event);
                setZoomed((z) => !z);
              }}
              onMouseMove={(event) => zoomed && pointAt(event)}
              aria-label={zoomed ? 'Dézoomer' : 'Zoomer'}
              className={cn('relative block size-full', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
            >
              <Image
                key={current.url}
                src={current.url}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain p-4 transition-transform duration-200 lg:p-10"
                style={{ transform: zoomed ? `scale(${ZOOM})` : 'none', transformOrigin: origin }}
              />
            </button>
          )}

          {many && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Photo précédente"
                className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-deep text-cream shadow-lg lg:left-8 lg:size-14"
              >
                <ChevronLeft className="size-6" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Photo suivante"
                className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-deep text-cream shadow-lg lg:right-8 lg:size-14"
              >
                <ChevronRight className="size-6" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          )}

          <span className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-muted-ink lg:flex">
            {zoomed ? <ZoomOut className="size-4" strokeWidth={1.8} aria-hidden="true" /> : <ZoomIn className="size-4" strokeWidth={1.8} aria-hidden="true" />}
            {zoomed ? 'Clique pour dézoomer' : 'Clique pour zoomer'}
          </span>
        </div>

        {many && (
          <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 [scrollbar-width:none] lg:gap-3 lg:pb-6">
            {images.map((image, i) => (
              <button
                key={image.url}
                type="button"
                onClick={() => {
                  setZoomed(false);
                  onIndexChange(i);
                }}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  'relative size-16 shrink-0 overflow-hidden rounded-2xl bg-white lg:size-20',
                  i === index ? 'ring-2 ring-accent ring-offset-2' : 'ring-1 ring-border hover:ring-ink',
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
