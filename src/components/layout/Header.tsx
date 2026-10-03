// src/components/layout/Header.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, Ruler, Search, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { useShoeSize, useSizePicker } from '@/features/size/SizeProvider';
import { useCartCount } from '@/features/cart/store';
import { BRANDS_LINK, DESKTOP_LINKS, cartLabel, isLinkActive, type BrandLink, type CollectionLink } from './nav-config';

type HeaderProps = {
  /** Marques actives (menu « Marques ») ; vide = simple lien. */
  brands: BrandLink[];
  /** Collections en cours (menu « Collections ») ; vide = onglet masqué. */
  collections: CollectionLink[];
};

const BRANDS_MENU_ID = 'brands-menu';
const COLLECTIONS_MENU_ID = 'collections-menu';

const navItem =
  'flex h-11 items-center rounded-full px-4 text-[0.78125rem] font-medium uppercase tracking-[0.14em] transition-colors duration-150';

/**
 * Header « capsule signature » : capsule ivoire flottante, détachée du bord.
 * Ordinateur : liens à gauche, marque au centre, pointure / recherche / panier à droite.
 * Mobile : marque, recherche et panier (la navigation est dans le dock du bas).
 */
export default function Header({ brands, collections }: HeaderProps) {
  const pathname = usePathname();
  // Le panier vit dans le navigateur : 0 au rendu serveur, le vrai nombre dès l'hydratation.
  const cartCount = useCartCount();
  const size = useShoeSize();
  const { openPicker } = useSizePicker();
  const [menu, setMenu] = useState<'brands' | 'collections' | null>(null);
  const brandsOpen = menu === 'brands';
  const collectionsOpen = menu === 'collections';
  const capsuleRef = useRef<HTMLDivElement>(null);

  // Changement de page : le menu se referme.
  useEffect(() => setMenu(null), [pathname]);

  // Menu ouvert : Échap ou clic à l'extérieur le referment.
  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMenu(null);
    const onPointerDown = (event: PointerEvent) => {
      if (!capsuleRef.current?.contains(event.target as Node)) setMenu(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menu]);

  const brandsActive = isLinkActive(pathname, BRANDS_LINK);
  const collectionsActive = pathname.startsWith('/collections/');
  const [firstLink, ...otherLinks] = DESKTOP_LINKS;

  const renderLink = (link: (typeof DESKTOP_LINKS)[number]) => {
    const active = isLinkActive(pathname, link);
    return (
      <li key={link.href}>
        <Link
          href={link.href}
          aria-current={active ? 'page' : undefined}
          className={cn(navItem, active ? 'bg-card text-ink' : 'text-muted-ink hover:bg-card hover:text-ink')}
        >
          {link.label}
        </Link>
      </li>
    );
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 lg:px-20 lg:pt-[18px]">
      <div
        ref={capsuleRef}
        className={cn(
          'relative mx-auto flex h-[62px] max-w-[80rem] items-center justify-between rounded-full border border-border bg-surface pl-5 pr-[7px]',
          'shadow-[0_14px_30px_-20px_rgba(42,14,30,0.4)] lg:grid lg:h-[76px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:pl-3.5 lg:pr-2.5',
          'lg:shadow-[0_18px_40px_-22px_rgba(42,14,30,0.35)]',
        )}
      >
        {/* Navigation (ordinateur) */}
        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {renderLink(firstLink)}

            {/* « Marques » : le mot mène à la page des marques, le chevron ouvre la liste. */}
            <li
              className={cn(
                'flex h-11 items-center rounded-full transition-colors duration-150',
                brandsOpen ? 'bg-deep text-cream' : brandsActive ? 'bg-card text-ink' : 'text-muted-ink hover:bg-card hover:text-ink',
              )}
            >
              <Link
                href={BRANDS_LINK.href}
                aria-current={pathname === BRANDS_LINK.href ? 'page' : undefined}
                className={cn('flex h-full items-center rounded-full pl-4 text-[0.78125rem] font-medium uppercase tracking-[0.14em]', brands.length === 0 && 'pr-4')}
              >
                {BRANDS_LINK.label}
              </Link>
              {brands.length > 0 && (
                <button
                  type="button"
                  aria-expanded={brandsOpen}
                  aria-controls={BRANDS_MENU_ID}
                  aria-label={brandsOpen ? 'Fermer la liste des marques' : 'Ouvrir la liste des marques'}
                  onClick={() => setMenu((open) => (open === 'brands' ? null : 'brands'))}
                  className={cn('mr-1 grid size-9 place-items-center rounded-full transition-colors', brandsOpen ? 'hover:bg-cream/15' : 'hover:bg-border')}
                >
                  <ChevronDown
                    className={cn('size-3.5 transition-transform duration-200', brandsOpen && 'rotate-180')}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              )}
            </li>

            {/* « Collections » : le bouton ouvre les collections en cours (chacune a sa page /collections/<slug>). */}
            {collections.length > 0 && (
              <li>
                <button
                  type="button"
                  aria-expanded={collectionsOpen}
                  aria-controls={COLLECTIONS_MENU_ID}
                  onClick={() => setMenu((open) => (open === 'collections' ? null : 'collections'))}
                  className={cn(
                    navItem,
                    'gap-2 pr-3',
                    collectionsOpen ? 'bg-deep text-cream' : collectionsActive ? 'bg-card text-ink' : 'text-muted-ink hover:bg-card hover:text-ink',
                  )}
                >
                  Collections
                  <ChevronDown className={cn('size-3.5 transition-transform duration-200', collectionsOpen && 'rotate-180')} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </li>
            )}

            {otherLinks.map(renderLink)}
          </ul>
        </nav>

        {/* Marque */}
        <Link
          href="/"
          aria-label={`${siteConfig.name}, accueil`}
          className="flex flex-col gap-1 lg:items-center lg:gap-1.5 lg:px-6"
        >
          <span className="font-display text-[1.375rem] leading-none lg:text-[1.875rem] lg:tracking-[0.02em]">
            {siteConfig.name}
          </span>
          <span className="text-[0.5rem] font-semibold leading-none tracking-[0.34em] text-accent-ink lg:text-[0.59375rem] lg:tracking-[0.36em]">
            SNEAKERS FOR EVERYONE
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={openPicker}
            aria-haspopup="dialog"
            aria-label={size ? `Ma pointure : ${size}. Changer` : 'Choisir ma pointure'}
            className="hidden h-12 items-center gap-2.5 rounded-full border border-border bg-page pl-1.5 pr-4 transition-colors hover:border-ink lg:flex"
          >
            <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-white">
              {size ?? <Ruler className="size-4" strokeWidth={1.8} aria-hidden="true" />}
            </span>
            <span className="text-[0.8125rem] font-medium">Ma pointure</span>
          </button>

          <Link
            href="/recherche"
            aria-label="Rechercher une paire"
            className="grid size-[46px] place-items-center rounded-full bg-card transition-colors hover:bg-border lg:size-12 lg:bg-transparent lg:hover:bg-card"
          >
            <Search className="size-[19px] lg:size-5" strokeWidth={1.7} aria-hidden="true" />
          </Link>

          <Link
            href="/panier"
            aria-label={cartLabel(cartCount)}
            className="relative grid size-12 place-items-center rounded-full bg-deep text-cream transition-transform active:scale-95 lg:size-[54px]"
          >
            <ShoppingBag className="size-5 lg:size-[21px]" strokeWidth={1.6} aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-[3px] -top-[3px] grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem] font-bold text-white ring-[3px] ring-surface lg:h-[22px] lg:min-w-[22px]">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Collections en cours (ordinateur) */}
        {collectionsOpen && (
          <div
            id={COLLECTIONS_MENU_ID}
            className="absolute inset-x-6 top-[calc(100%+10px)] hidden rounded-[30px] border border-border bg-surface p-8 shadow-[0_40px_80px_-30px_rgba(42,14,30,0.45)] lg:block"
          >
            <p className="text-[0.71875rem] font-semibold tracking-[0.22em] text-muted-ink">COLLECTIONS DU MOMENT</p>
            <ul className="mt-5 grid grid-cols-3 gap-3">
              {collections.map((collection) => (
                <li key={collection.slug}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    // Depuis /boutique, seule la recherche change : on referme le menu nous-mêmes.
                    onClick={() => setMenu(null)}
                    className="group flex h-full flex-col justify-between gap-6 rounded-[22px] bg-section p-5 transition-colors hover:bg-deep"
                  >
                    <span className="font-display text-[1.5rem] leading-tight text-deep transition-colors group-hover:text-cream">{collection.name}</span>
                    <span className="flex items-center justify-between text-[0.8125rem] font-semibold text-section-ink transition-colors group-hover:text-accent-soft">
                      {collection.count} paire{collection.count > 1 ? 's' : ''}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/boutique" onClick={() => setMenu(null)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-ink hover:text-ink">
              Toute la boutique
              <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Liste des marques (ordinateur) */}
        {brandsOpen && (
          <div
            id={BRANDS_MENU_ID}
            className="absolute inset-x-6 top-[calc(100%+10px)] hidden rounded-[30px] border border-border bg-surface p-8 shadow-[0_40px_80px_-30px_rgba(42,14,30,0.45)] lg:block"
          >
            <p className="text-[0.71875rem] font-semibold tracking-[0.22em] text-muted-ink">MARQUES</p>
            <ul className="mt-5 grid grid-cols-4 gap-x-8 gap-y-3">
              {brands.map((brand) => (
                <li key={brand.slug}>
                  <Link href={`/marques/${brand.slug}`} className="font-display text-[1.625rem] leading-tight transition-colors hover:text-accent-ink">
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={BRANDS_LINK.href}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-ink hover:text-ink"
            >
              Toutes les marques
              <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
