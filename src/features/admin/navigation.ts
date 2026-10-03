import { Images, Layers, LayoutDashboard, Package, ReceiptText, Settings2, Tag, Users, type LucideIcon } from 'lucide-react';

export type AdminNavKey = 'dashboard' | 'orders' | 'products' | 'collections' | 'promotions' | 'clients' | 'gallery' | 'settings';

export type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Autres préfixes d'URL qui rendent l'entrée active. */
  match?: string[];
};

/** Pastilles de la navigation (commandes à confirmer, stock bas). */
export type AdminBadges = Partial<Record<AdminNavKey, { count: number; label: string; tone: 'count' | 'alert' }>>;

const ITEMS: Record<AdminNavKey, AdminNavItem> = {
  dashboard: { key: 'dashboard', label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
  orders: { key: 'orders', label: 'Commandes', href: '/admin/commandes', icon: ReceiptText },
  products: { key: 'products', label: 'Produits', href: '/admin/produits', icon: Package },
  collections: { key: 'collections', label: 'Collections', href: '/admin/collections', icon: Layers },
  promotions: { key: 'promotions', label: 'Promotions', href: '/admin/promotions', icon: Tag },
  clients: { key: 'clients', label: 'Clients', href: '/admin/clients', icon: Users },
  gallery: { key: 'gallery', label: 'Galerie', href: '/admin/galerie', icon: Images },
  settings: { key: 'settings', label: 'Paramètres', href: '/admin/parametres', icon: Settings2 },
};

/** Barre desktop : 6 entrées. Les paramètres sont dans le menu de l'avatar. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ITEMS.dashboard,
  ITEMS.orders,
  ITEMS.products,
  ITEMS.collections,
  ITEMS.promotions,
  ITEMS.clients,
];

/** Paramètres de la boutique : menu de l'avatar (ordinateur) et panneau « Plus » (mobile). */
export const ADMIN_SETTINGS_ITEM: AdminNavItem = ITEMS.settings;

/** Barre du bas mobile : 4 destinations + « Plus ». */
export const ADMIN_MOBILE_TABS: AdminNavItem[] = [
  { ...ITEMS.dashboard, label: 'Accueil' },
  ITEMS.orders,
  ITEMS.products,
  ITEMS.collections,
];

/** Contenu du panneau « Plus » (mobile). Clients est aussi dans les actions rapides du tableau de bord. */
export const ADMIN_MORE_ITEMS: AdminNavItem[] = [ITEMS.promotions, ITEMS.clients, ITEMS.gallery, ITEMS.settings];

export function isAdminNavActive(pathname: string, item: AdminNavItem): boolean {
  if (item.href === '/admin') return pathname === '/admin';
  return [item.href, ...(item.match ?? [])].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
