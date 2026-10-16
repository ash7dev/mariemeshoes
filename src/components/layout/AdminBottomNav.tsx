// src/components/layout/AdminBottomNav.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ExternalLink, LogOut, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/features/auth/actions';
import { ADMIN_MOBILE_TABS, ADMIN_MORE_ITEMS, isAdminNavActive, type AdminBadges } from '@/features/admin/navigation';

type AdminBottomNavProps = {
  badges: AdminBadges;
  admin: { fullName: string };
};

/** Formulaires plein écran (fiche produit, promotion) : leur propre barre d'actions remplace la navigation. */
const FOCUS_ROUTES = ['/admin/produits/', '/admin/promotions/'];

const tab =
  'relative flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-[18px] text-[0.6875rem] font-medium transition-colors duration-150';

/** Barre du bas de l'admin (mobile) : Accueil · Commandes · Produits · Collections · Plus. */
export default function AdminBottomNav({ badges, admin }: AdminBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  // Changement de page : le panneau se referme.
  useEffect(() => setMoreOpen(false), [pathname]);

  const moreActive = ADMIN_MORE_ITEMS.some((item) => isAdminNavActive(pathname, item)) || pathname.startsWith('/admin/compte');

  if (FOCUS_ROUTES.some((route) => pathname.startsWith(route))) return null;

  return (
    <>
      {/* Réserve la place de la barre : aucun contenu ne passe dessous. */}
      <div aria-hidden="true" className="h-[calc(6.5rem+env(safe-area-inset-bottom))] lg:hidden" />

      <nav
        aria-label="Administration"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="mx-auto flex max-w-md gap-0.5 rounded-[24px] bg-deep p-1.5 shadow-[0_20px_40px_-16px_rgba(42,14,30,0.6)]">
          {ADMIN_MOBILE_TABS.map((item) => {
            const active = isAdminNavActive(pathname, item) && !moreOpen;
            const badge = badges[item.key];
            const showBadge = badge && badge.count > 0;
            const Icon = item.icon;
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={showBadge ? `${item.label}, ${badge.label}` : undefined}
                  className={cn(tab, active ? 'bg-cream text-deep' : 'text-[#CDBBC5] active:bg-cream/10')}
                >
                  <span className="relative">
                    <Icon className="size-[21px]" strokeWidth={active ? 1.8 : 1.6} aria-hidden="true" />
                    {showBadge && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute bg-accent ring-2',
                          active ? 'ring-cream' : 'ring-deep',
                          badge.tone === 'count'
                            ? '-right-3 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[0.65625rem] font-bold tabular-nums text-white'
                            : '-right-1 -top-0.5 size-2 rounded-full',
                        )}
                      >
                        {badge.tone === 'count' ? (badge.count > 9 ? '9+' : badge.count) : null}
                      </span>
                    )}
                  </span>
                  <span aria-hidden={showBadge ? true : undefined}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(tab, moreActive || moreOpen ? 'bg-cream text-deep' : 'text-[#CDBBC5] active:bg-cream/10')}
            >
              <MoreHorizontal className="size-[21px]" strokeWidth={1.8} aria-hidden="true" />
              Plus
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialogRef}
        aria-label="Plus"
        onClose={() => setMoreOpen(false)}
        onClick={(event) => event.target === event.currentTarget && setMoreOpen(false)}
        className="fixed inset-x-2 bottom-[max(1rem,env(safe-area-inset-bottom))] top-auto m-0 w-auto max-w-none rounded-[32px] bg-surface p-0 text-ink shadow-[0_30px_60px_-20px_rgba(42,14,30,0.55)] backdrop:bg-ink/40 lg:hidden"
      >
        <div className="flex flex-col gap-3.5 px-3.5 pb-4 pt-2.5">
          <div className="flex items-center justify-between pl-2">
            <span aria-hidden="true" className="h-[5px] w-10 rounded-full bg-border" />
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Fermer"
              className="grid size-11 place-items-center rounded-full text-muted-ink transition-colors hover:bg-card hover:text-ink"
            >
              <X className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-2.5">
            {ADMIN_MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link href={item.href} className="flex h-[104px] flex-col justify-between rounded-[22px] bg-card p-4 transition-colors active:bg-border">
                    <span className="grid size-10 place-items-center rounded-full bg-deep text-cream">
                      <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="text-[0.9375rem] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="overflow-hidden rounded-[22px] bg-card">
            <Link href="/admin/compte" className="flex h-[60px] items-center gap-3 border-b border-border px-4">
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-deep font-display text-[0.9375rem] text-cream">
                {admin.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[0.9375rem]">Mon compte</span>
                <span className="text-xs text-muted-ink">Mot de passe, appareils, notifications</span>
              </span>
              <ChevronRight className="size-4 text-accent-ink" strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link href="/" target="_blank" className="flex h-[54px] items-center gap-3 border-b border-border px-4">
              <ExternalLink className="size-[18px] text-accent-ink" strokeWidth={1.6} aria-hidden="true" />
              <span className="text-[0.9375rem]">Voir la boutique</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex h-[54px] w-full items-center gap-3 px-4 text-left text-accent-ink">
                <LogOut className="size-[18px]" strokeWidth={1.6} aria-hidden="true" />
                <span className="text-[0.9375rem]">Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
