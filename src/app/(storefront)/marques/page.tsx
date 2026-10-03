import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';
import { getStoreSettings } from '@/features/settings/queries';
import { getBrandIndex } from '@/features/shop/queries';
import { whatsappLink } from '@/lib/whatsapp';
import SizeSync from '@/features/shop/components/SizeSync';
import BrandIndex from '@/features/shop/components/BrandIndex';
import { CatalogEmpty } from '@/features/shop/components/ShopSections';

export const metadata: Metadata = {
  title: 'Marques',
  description: 'Nike, Adidas, New Balance, Jordan… Toutes les marques de sneakers neuves de Mariemeshoes, avec les paires disponibles dans ta pointure.',
};

/** Page Marques : « l'Index », chaque marque en grand avec ses paires du moment. */
export default async function BrandsPage() {
  const cookieStore = await cookies();
  const size = parseSize(cookieStore.get(SIZE_COOKIE)?.value);
  const [brands, settings] = await Promise.all([getBrandIndex(size), getStoreSettings()]);
  const totalModels = brands.reduce((sum, b) => sum + b.models, 0);
  const whatsappHref = whatsappLink(settings.whatsappNumber, 'Bonjour Mariemeshoes, je cherche une marque que je ne trouve pas sur le site.');

  const intro = (
    <section className="flex flex-col gap-2.5 px-4 pt-[18px] lg:gap-[18px] lg:px-0 lg:pt-16">
      <p className="text-[0.65625rem] font-bold tracking-[0.26em] text-accent-ink lg:text-[0.6875rem] lg:tracking-[0.28em]">
        LES MARQUES · {brands.length} MAISON{brands.length > 1 ? 'S' : ''}
      </p>
      <h1 className="font-display text-[2.75rem] leading-[0.95] lg:text-[5.5rem] lg:leading-[0.92] lg:tracking-[-0.015em]">
        Chaque marque,
        <br className="hidden lg:block" /> ses classiques.
      </h1>
      <p className="hidden max-w-[560px] text-[1.0625rem] leading-relaxed text-muted-ink lg:block">
        Touche une marque pour voir ses paires du moment.
        {size ? ` Les chiffres tiennent compte de ta pointure : tu vois ce qui existe en ${size}.` : ` ${totalModels} modèles neufs, livrés partout au Sénégal.`}
      </p>
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-[90rem] pb-6 lg:px-20">
      <SizeSync serverSize={size} />
      <div className="mx-auto max-w-[80rem]">
        {brands.length === 0 ? (
          <>
            {intro}
            <CatalogEmpty whatsapp={settings.whatsappNumber} />
          </>
        ) : (
          <BrandIndex brands={brands} size={size} whatsappHref={whatsappHref} intro={intro} />
        )}
      </div>
    </div>
  );
}
