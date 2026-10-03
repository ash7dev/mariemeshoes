// src/components/layout/nav-config.ts
import { House, Images, LayoutGrid, type LucideIcon } from 'lucide-react';

export type NavLink = {
  label: string;
  href: string;
  /** Préfixes d'URL qui rendent le lien actif. Par défaut : href. */
  match?: string[];
};

export type MobileNavLink = NavLink & { icon: LucideIcon };

export type BrandLink = { name: string; slug: string };

/** Collection en cours du menu « Collections » (ordinateur) ; count = paires visibles. */
export type CollectionLink = { name: string; slug: string; count: number };

/**
 * Desktop : Boutique · Marques ▾ · Collections ▾ · Galerie. « Marques » et « Collections »
 * sont rendus par le header et ouvrent leur liste. Nouveautés et genres
 * (Homme / Femme / Enfant) sont des tris et filtres de la boutique.
 */
export const DESKTOP_LINKS: NavLink[] = [
  { label: 'Boutique', href: '/boutique', match: ['/boutique', '/nouveautes', '/homme', '/femme', '/enfant', '/recherche'] },
  { label: 'Galerie', href: '/galerie' },
];

export const BRANDS_LINK: NavLink = { label: 'Marques', href: '/marques' };

/**
 * Mobile : trois onglets dans la capsule ; la pointure a sa propre sphère,
 * le panier et la recherche sont dans l'en-tête.
 */
export const MOBILE_LINKS: MobileNavLink[] = [
  { label: 'Accueil', href: '/', icon: House, match: ['/'] },
  {
    label: 'Boutique',
    href: '/boutique',
    icon: LayoutGrid,
    match: ['/boutique', '/nouveautes', '/homme', '/femme', '/enfant', '/marques', '/collections', '/recherche'],
  },
  { label: 'Galerie', href: '/galerie', icon: Images },
];

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Boutique',
    links: [
      { label: 'Toutes les paires', href: '/boutique' },
      { label: 'Marques', href: '/marques' },
      { label: 'Galerie', href: '/galerie' },
    ],
  },
  {
    title: 'Aide',
    links: [
      { label: 'Guide des pointures', href: '/guide-des-pointures' },
      { label: 'Livraison', href: '/livraison' },
      { label: 'Payer avec Wave', href: '/paiement' },
      { label: 'Suivre ma commande', href: '/suivre-ma-commande' },
    ],
  },
  {
    title: 'Mariemeshoes',
    links: [{ label: 'À propos', href: '/a-propos' }],
  },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: 'Conditions de vente', href: '/conditions-de-vente' },
  { label: 'Confidentialité', href: '/confidentialite' },
];

/**
 * Pages où le dock mobile disparaît : le checkout reste sans distraction,
 * la fiche produit et le panier ont leur propre barre d'action en bas.
 */
export const BOTTOM_NAV_HIDDEN_ON = ['/commande', '/panier', '/produits'];

export function isLinkActive(pathname: string, link: NavLink): boolean {
  const prefixes = link.match ?? [link.href];
  return prefixes.some((prefix) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldHideBottomNav(pathname: string): boolean {
  return BOTTOM_NAV_HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function cartLabel(count: number): string {
  return count === 0 ? 'Panier, vide' : `Panier, ${count} paire${count > 1 ? 's' : ''}`;
}
