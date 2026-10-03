import StorefrontShell from '@/components/layout/StorefrontShell';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { getMenuCollections } from '@/features/shop/queries';
import { getPublicPromotions, promotionHeadline } from '@/features/promotions/public';

/** Habillage de toutes les pages boutique (hors /admin). */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [brands, collections, promotions] = await Promise.all([
    withDbRetry(() =>
      prisma.brand.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { name: true, slug: true },
      }),
    ),
    getMenuCollections(),
    // Une erreur sur les promotions ne doit pas casser toutes les pages : pas d'annonce.
    getPublicPromotions().catch((error) => {
      console.error('Promotions en cours illisibles', error);
      return [];
    }),
  ]);
  const top = promotions[0];
  const announcement = top ? { text: promotionHeadline(top), href: top.href ?? '/#promos' } : null;

  return (
    <StorefrontShell brands={brands} collections={collections} announcement={announcement}>
      {children}
    </StorefrontShell>
  );
}
