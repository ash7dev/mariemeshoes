import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { siteConfig } from '@/config/site';

export type StoreSettingsData = {
  storeName: string;
  whatsappNumber: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  waveMerchantCode: string | null;
  wavePaymentLink: string | null;
  updatedAt: string | null;
};

/**
 * Paramètres de la boutique (ligne unique id = 1). Tant qu'un champ n'est pas rempli
 * dans l'admin, la valeur des variables d'environnement sert de secours (WhatsApp, réseaux).
 * Mis en cache pour la durée d'une requête.
 */
export const getStoreSettings = cache(async (): Promise<StoreSettingsData> => {
  const row = await withDbRetry(() => prisma.storeSettings.findUnique({ where: { id: 1 } })).catch((error) => {
    console.error('Paramètres de la boutique illisibles', error);
    return null;
  });
  return {
    storeName: row?.storeName ?? siteConfig.name,
    whatsappNumber: row?.whatsappNumber ?? (siteConfig.whatsapp || null),
    contactPhone: row?.contactPhone ?? null,
    contactEmail: row?.contactEmail ?? null,
    instagramUrl: row?.instagramUrl ?? (siteConfig.socials.instagram || null),
    tiktokUrl: row?.tiktokUrl ?? (siteConfig.socials.tiktok || null),
    waveMerchantCode: row?.waveMerchantCode ?? null,
    wavePaymentLink: row?.wavePaymentLink ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
});

export type ZoneRow = { id: string; name: string; fee: number; estimatedDelay: string | null; isActive: boolean; orders: number };
export type CatalogRow = { id: string; name: string; slug: string; isActive: boolean; position: number; products: number };

/** Tout ce que la page Paramètres affiche. */
export async function getAdminSettings() {
  const [settings, zones, brands, categories] = await Promise.all([
    getStoreSettings(),
    withDbRetry(() =>
      prisma.deliveryZone.findMany({
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, fee: true, estimatedDelay: true, isActive: true, _count: { select: { orders: true } } },
      }),
    ),
    withDbRetry(() =>
      prisma.brand.findMany({
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, isActive: true, position: true, _count: { select: { products: true } } },
      }),
    ),
    withDbRetry(() =>
      prisma.category.findMany({
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, isActive: true, position: true, _count: { select: { products: true } } },
      }),
    ),
  ]);

  const toCatalog = (rows: typeof brands): CatalogRow[] =>
    rows.map(({ _count, ...row }) => ({ ...row, products: _count.products }));

  return {
    settings,
    zones: zones.map(({ _count, ...zone }) => ({ ...zone, orders: _count.orders })) as ZoneRow[],
    brands: toCatalog(brands),
    categories: toCatalog(categories),
  };
}
