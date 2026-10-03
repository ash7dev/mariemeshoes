import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';
import { getStoreSettings } from '@/features/settings/queries';
import { getHomePage } from '@/features/home/queries';
import DropStage from '@/features/home/components/DropStage';
import HomePromos from '@/features/home/components/HomePromos';
import { BrandsWall, CollectionsBento, Engagements, SectionTitle } from '@/features/home/components/HomeSections';
import SizeSync from '@/features/shop/components/SizeSync';
import ProductCard from '@/features/shop/components/ProductCard';
import ProductCardMobile from '@/features/shop/components/ProductCardMobile';
import { CatalogEmpty } from '@/features/shop/components/ShopSections';

export const metadata: Metadata = {
  description: 'Sneakers 100 % neuves livrées partout au Sénégal. Paiement Wave ou à la livraison. Choisis ta pointure, on te montre ce qu’on a pour toi.',
};

/** Cartes du bandeau Nouveautés sur mobile (défilement vertical : on reste court). */
const NEWS_MOBILE = 3;

/** Accueil « Le Défilé » : la scène, les promotions en cours, les collections, les nouveautés, les marques. */
export default async function HomePage() {
  const cookieStore = await cookies();
  const size = parseSize(cookieStore.get(SIZE_COOKIE)?.value);
  const [home, settings] = await Promise.all([getHomePage(size), getStoreSettings()]);

  if (home.catalogEmpty) {
    return (
      <div className="mx-auto w-full max-w-[80rem] px-4 lg:px-10">
        <SizeSync serverSize={size} />
        <CatalogEmpty whatsapp={settings.whatsappNumber} />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-6">
      <SizeSync serverSize={size} />
      <h1 className="sr-only">Mariemeshoes, sneakers neuves au Sénégal</h1>

      {home.drop.length > 0 && <DropStage title={home.dropTitle} slides={home.drop} size={size} />}
      <Engagements />

      <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-9 px-3 pt-6 lg:gap-24 lg:px-10 lg:pt-[72px]">
        <HomePromos promos={home.promos} freeDelivery={home.freeDelivery} size={size} />
        <CollectionsBento collections={home.collections} />

        <section aria-labelledby="home-news" className="flex flex-col gap-3.5 px-1 lg:gap-[26px] lg:px-0">
          <SectionTitle id="home-news" href="/boutique" linkLabel="Voir la boutique">
            {home.newsTitle}
            {home.newsInSize && <span className="text-accent-ink"> en {size}</span>}
          </SectionTitle>
          <div className="hidden grid-cols-4 gap-6 lg:grid">
            {home.news.map((card) => (
              <ProductCard key={card.id} card={card} size={size} />
            ))}
          </div>
          <div className="flex flex-col gap-4 lg:hidden">
            {home.news.slice(0, NEWS_MOBILE).map((card) => (
              <ProductCardMobile key={card.id} card={card} size={size} />
            ))}
            <Link href="/boutique" className="flex h-[52px] items-center justify-center rounded-full border border-deep text-sm font-semibold">
              Voir toute la boutique
            </Link>
          </div>
        </section>

        <BrandsWall brands={home.brands} />
      </div>
    </div>
  );
}
