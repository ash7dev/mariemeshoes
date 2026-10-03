'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADULT_SIZES, KID_SIZES } from './sizes';
import { setShoeSize, useShoeSize, useSizePicker } from './SizeProvider';

/**
 * Sélecteur de pointure. <dialog> natif : focus piégé, Échap, fond assombri.
 * Mobile : panneau posé au-dessus du dock. Ordinateur : fenêtre centrée.
 */
export default function SizePicker() {
  const { open, closePicker } = useSizePicker();
  const size = useShoeSize();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kids, setKids] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setKids(size !== null && size < 36);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, size]);

  const choose = (value: number | null) => {
    setShoeSize(value);
    closePicker();
  };

  const sizes = kids ? KID_SIZES : ADULT_SIZES;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="size-picker-title"
      onClose={closePicker}
      // Clic sur le fond (hors du panneau) : fermeture.
      onClick={(event) => event.target === dialogRef.current && closePicker()}
      className={cn(
        'w-[calc(100%-24px)] max-w-[440px] rounded-[30px] bg-surface p-0 text-ink shadow-[0_30px_60px_-20px_rgba(42,14,30,0.55)]',
        'backdrop:bg-ink/40',
        'max-lg:mt-auto max-lg:mb-[108px]',
      )}
    >
      <div className="flex flex-col gap-5 p-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="size-picker-title" className="font-display text-2xl">
              Ta pointure
            </h2>
            <p className="text-[0.84375rem] text-muted-ink">Tout le site s&apos;adapte à ta taille.</p>
          </div>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Fermer"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-card transition-colors hover:bg-border"
          >
            <X className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <div role="group" aria-label="Type de pointure" className="grid grid-cols-2 gap-1 rounded-full bg-card p-1">
          {[
            { label: 'Adulte', value: false },
            { label: 'Enfant', value: true },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              aria-pressed={kids === tab.value}
              onClick={() => setKids(tab.value)}
              className={cn(
                'h-10 rounded-full text-sm font-semibold transition-colors',
                kids === tab.value ? 'bg-surface text-ink shadow-sm' : 'text-muted-ink hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {sizes.map((value) => {
            const selected = value === size;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => choose(value)}
                className={cn(
                  'h-[46px] rounded-[14px] border text-[0.9375rem] font-semibold transition-colors',
                  selected
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-page text-ink hover:border-ink',
                )}
              >
                {value}
              </button>
            );
          })}
        </div>

        {size !== null && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="self-center text-sm font-medium text-muted-ink underline underline-offset-4 hover:text-ink"
          >
            Voir toutes les pointures
          </button>
        )}
      </div>
    </dialog>
  );
}
