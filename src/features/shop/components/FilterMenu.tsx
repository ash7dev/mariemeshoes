'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MenuItem = { label: string; href: string; selected: boolean };

type FilterMenuProps = {
  label: React.ReactNode;
  /** Nombre de choix actifs (pastille), 0 = aucune. */
  activeCount?: number;
  items: MenuItem[];
  align?: 'left' | 'right';
  /** Plusieurs choix possibles (case cochée) ou un seul (coche simple). */
  multiple?: boolean;
  /** « outline » : bouton cerclé (tri). */
  variant?: 'ghost' | 'outline';
};

/**
 * Menu déroulant de la barre de filtres. Chaque choix est un lien (filtres dans l'URL) :
 * le menu se referme après la navigation, au clic extérieur et avec Échap.
 */
export default function FilterMenu({ label, activeCount = 0, items, align = 'left', multiple = false, variant = 'ghost' }: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const searchParams = useSearchParams();

  useEffect(() => setOpen(false), [searchParams]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-12 items-center gap-2 rounded-full pl-5 pr-4 text-sm font-medium transition-colors',
          open ? 'bg-deep text-cream' : variant === 'outline' ? 'border border-border bg-page hover:border-ink' : 'hover:bg-card',
        )}
      >
        {label}
        {activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem] font-bold text-white">{activeCount}</span>
        )}
        <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          className={cn(
            'absolute top-[calc(100%+10px)] z-30 flex max-h-[min(60vh,26rem)] w-64 flex-col overflow-y-auto rounded-[24px] border border-border bg-surface p-2 shadow-[0_30px_60px_-24px_rgba(42,14,30,0.45)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-ink">Rien pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    scroll={false}
                    aria-current={item.selected ? 'true' : undefined}
                    className={cn(
                      'flex min-h-11 items-center justify-between gap-3 rounded-2xl px-4 text-sm transition-colors hover:bg-card',
                      item.selected && 'font-semibold',
                    )}
                  >
                    {item.label}
                    {multiple ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-md border',
                          item.selected ? 'border-deep bg-deep text-cream' : 'border-[#D5CABE]',
                        )}
                      >
                        {item.selected && <Check className="size-3.5" strokeWidth={2.4} />}
                      </span>
                    ) : (
                      item.selected && <Check className="size-4 shrink-0 text-accent-ink" strokeWidth={2.2} aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
