import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';

export type AdminGalleryPost = {
  id: string;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  pairLabel: string;
  pairHref: string;
  isPublished: boolean;
  /** La paire n'est pas visible en boutique : la photo non plus. */
  pairHidden: boolean;
};

const ADMIN_SELECT = {
  id: true,
  imagePath: true,
  width: true,
  height: true,
  caption: true,
  colorwayId: true,
  isPublished: true,
  colorway: {
    select: {
      slug: true,
      name: true,
      isActive: true,
      publishedAt: true,
      totalStock: true,
      product: { select: { name: true, isActive: true, brand: { select: { name: true, isActive: true } } } },
    },
  },
} as const;

type Row = Awaited<ReturnType<typeof findRows>>[number];
const findRows = (where: { id?: string } = {}) =>
  prisma.galleryPost.findMany({ where, orderBy: [{ isPublished: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }], select: ADMIN_SELECT });

function toAdmin(row: Row, now: Date): AdminGalleryPost {
  const c = row.colorway;
  return {
    id: row.id,
    imageUrl: productImageUrl(row.imagePath),
    width: row.width,
    height: row.height,
    caption: row.caption,
    pairLabel: `${c.product.brand.name} ${c.product.name} · ${c.name}`,
    pairHref: `/produits/${c.slug}`,
    isPublished: row.isPublished,
    pairHidden: !c.isActive || !c.publishedAt || c.publishedAt > now || !c.product.isActive || !c.product.brand.isActive || c.totalStock <= 0,
  };
}

/** Toutes les photos (brouillons d'abord, puis les plus récentes). */
export async function listAdminGallery(): Promise<AdminGalleryPost[]> {
  const now = new Date();
  const rows = await withDbRetry(() => findRows());
  return rows.map((row) => toAdmin(row, now));
}

export type GalleryPostForEdit = AdminGalleryPost & { imagePath: string; colorwayId: string };

export async function getGalleryPostForEdit(id: string): Promise<GalleryPostForEdit | null> {
  const now = new Date();
  const [row] = await withDbRetry(() => findRows({ id }));
  return row ? { ...toAdmin(row, now), imagePath: row.imagePath, colorwayId: row.colorwayId } : null;
}
