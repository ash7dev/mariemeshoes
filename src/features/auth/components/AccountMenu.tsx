'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellRing, ChevronDown, Images, KeyRound, LogOut, MonitorSmartphone, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction, logoutEverywhereAction } from '../actions';

type AccountMenuProps = {
  fullName: string;
  email: string;
  roleLabel: string;
};

const item =
  'flex h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm text-ink transition-colors duration-150 hover:bg-card';

/** Menu du compte admin (avatar du header) : identité, paramètres de la boutique, mot de passe, déconnexion. */
export default function AccountMenu({ fullName, email, roleLabel }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Compte de ${fullName}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center gap-2 rounded-full transition-colors duration-150 lg:h-[52px] lg:border lg:pl-[5px] lg:pr-3',
          open ? 'lg:border-deep lg:bg-deep lg:text-cream' : 'lg:border-border lg:bg-page hover:lg:border-ink',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-[46px] place-items-center rounded-full font-display text-lg lg:size-10 lg:text-[1.0625rem]',
            open ? 'bg-cream text-deep max-lg:bg-deep max-lg:text-cream' : 'bg-deep text-cream',
          )}
        >
          {initial}
        </span>
        <ChevronDown
          className={cn('hidden size-3.5 transition-transform duration-200 lg:block', open && 'rotate-180')}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id="account-menu"
          className="absolute right-0 top-full z-50 mt-2.5 w-[19rem] rounded-[28px] border border-border bg-surface p-2 shadow-[0_30px_60px_-24px_rgba(42,14,30,0.45)]"
        >
          <div className="px-3.5 pb-3 pt-2.5">
            <p className="font-display text-xl leading-tight">{fullName}</p>
            <p className="mt-1 truncate text-sm text-muted-ink">{email}</p>
            <p className="mt-2 inline-flex rounded-full bg-section px-2.5 py-1 text-xs font-semibold text-section-ink">{roleLabel}</p>
          </div>
          <div className="border-t border-border pt-2">
            <Link href="/admin/galerie" onClick={() => setOpen(false)} className={item}>
              <Images className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
              Galerie
            </Link>
            <Link href="/admin/parametres" onClick={() => setOpen(false)} className={item}>
              <Settings2 className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
              Paramètres de la boutique
            </Link>
            <Link href="/admin/compte#notifications" onClick={() => setOpen(false)} className={item}>
              <BellRing className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
              Notifications
            </Link>
            <Link href="/admin/compte" onClick={() => setOpen(false)} className={item}>
              <KeyRound className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
              Mon compte et mot de passe
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={item}>
                <LogOut className="size-[18px] text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
                Se déconnecter
              </button>
            </form>
            <form action={logoutEverywhereAction}>
              <button type="submit" className={cn(item, 'h-auto items-start py-3')}>
                <MonitorSmartphone className="mt-0.5 size-[18px] shrink-0 text-accent-ink" strokeWidth={1.7} aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-accent-ink">Déconnecter tous mes appareils</span>
                  <span className="text-xs text-muted-ink">Téléphone perdu, ordinateur partagé…</span>
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
