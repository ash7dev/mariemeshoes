import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';
import { getStoreSettings } from '@/features/settings/queries';
import { getProductPage } from '@/features/shop/queries';
import ProductStage from '@/features/shop/components/ProductStage';
import ProductCard from '@/features/shop/components/ProductCard';
import ProductCardMini from '@/features/shop/components/ProductCardMini';
import { formatFCFA } from '@/lib/money';

type Params = { params: Promise<{ slug: string }> };

const isSlug = (slug: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 200;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);
  if (!isSlug(slug)) return {};
  // Mêmes arguments que la page : une seule lecture en base (cache de requête).
  const page = await getProductPage(slug, parseSize(cookieStore.get(SIZE_COOKIE)?.value));
  if (!page) return { title: 'Paire introuvable' };
  const { card } = page;
  const title = `${card.brand} ${card.model} ${card.colorway}`;
  return {
    title,
    description: `${title} neuve à ${formatFCFA(card.price)}. Livraison partout au Sénégal, paiement Wave ou à la livraison.`,
    openGraph: { title, images: page.images[0] ? [{ url: page.images[0].url }] : undefined },
  };
}

/** Fiche produit « La Scène » : une page par coloris. */
export default async function ProductPage({ params }: Params) {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);
  if (!isSlug(slug)) notFound();
  const size = parseSize(cookieStore.get(SIZE_COOKIE)?.value);
  const [page, settings] = await Promise.all([getProductPage(slug, size), getStoreSettings()]);
  if (!page) notFound();

  return (
    // Mobile : place pour la barre d'achat fixe (le dock est masqué sur /produits).
    <div className="pb-28 lg:pb-0">
      <ProductStage page={page} initialSize={size} whatsappNumber={settings.whatsappNumber} />

      {page.recommendations.length > 0 && (
        <section aria-labelledby="recos-title" className="mx-auto mt-14 flex max-w-[90rem] flex-col gap-4 px-4 lg:mt-[88px] lg:gap-6 lg:px-20">
          <div className="mx-auto flex w-full max-w-[80rem] items-baseline justify-between gap-4">
            <h2 id="recos-title" className="font-display text-[1.625rem] lg:text-[2.5rem]">
              {size ? 'Aussi dans ta pointure' : 'Tu aimeras aussi'}
            </h2>
            <Link href="/boutique" className="shrink-0 text-sm font-semibold text-accent-ink">
              {size ? `Tout voir en ${size} →` : 'Toute la boutique →'}
            </Link>
          </div>
          <ul className="mx-auto hidden w-full max-w-[80rem] grid-cols-4 gap-6 lg:grid">
            {page.recommendations.map((card) => (
              <li key={card.id}>
                <ProductCard card={card} size={size} />
              </li>
            ))}
          </ul>
          {/* Mobile : deux par ligne, pour voir plusieurs suggestions d'un coup. */}
          <ul className="grid grid-cols-2 gap-3 lg:hidden">
            {page.recommendations.map((card) => (
              <li key={card.id}>
                <ProductCardMini card={card} size={size} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
