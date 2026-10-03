import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Images, MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/whatsapp';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';
import { getStoreSettings } from '@/features/settings/queries';
import { getPublicGallery } from '@/features/gallery/public-queries';
import GalleryWall from '@/features/gallery/components/GalleryWall';
import SizeSync from '@/features/shop/components/SizeSync';

export const metadata: Metadata = {
  title: 'Galerie',
  description: 'Nos paires portées à Dakar et ailleurs. Une photo te plaît ? La paire est à un clic.',
};

/** Pages chargées au plus (« Voir plus de photos »). */
const MAX_PAGE = 20;

/** Galerie « Le Mur » : photos portées en colonnes, chacune reliée à sa paire. */
export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [{ page: rawPage }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1));
  const size = parseSize(cookieStore.get(SIZE_COOKIE)?.value);
  const [{ posts, hasMore }, settings] = await Promise.all([getPublicGallery(page, size), getStoreSettings()]);
  const shareHref = whatsappLink(settings.whatsappNumber, 'Bonjour Mariemeshoes, voici une photo de ma paire pour la galerie.');

  return (
    <div className="mx-auto flex w-full max-w-[80rem] flex-col px-3 pb-10 lg:px-10">
      <SizeSync serverSize={size} />

      <header className="flex flex-col gap-3 px-1 pb-5 pt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-0 lg:pb-8 lg:pt-14">
        <div className="flex flex-col gap-2.5 lg:gap-4">
          <span className="text-[0.65625rem] font-semibold tracking-[0.24em] text-accent-ink lg:text-xs lg:tracking-[0.26em]">LA GALERIE</span>
          <h1 className="font-display text-[2.75rem] leading-[0.92] lg:text-[4.5rem]">Inspire-toi, puis choisis</h1>
        </div>
        <p className="max-w-[25rem] text-sm leading-relaxed text-muted-ink lg:text-[0.9375rem]">
          Touche une photo : la paire qu’elle porte s’affiche à côté, prête à être ajoutée au panier.
        </p>
      </header>

      {posts.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-surface text-accent-ink">
            <Images className="size-7" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="font-display text-[1.75rem] leading-tight lg:text-[2.25rem]">Les premières photos arrivent</h2>
          <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-ink">En attendant, toutes les paires t’attendent dans la boutique.</p>
          <Link href="/boutique" className="mt-2 flex h-12 items-center rounded-full bg-deep px-6 text-sm font-semibold text-cream">
            Voir la boutique
          </Link>
        </section>
      ) : (
        <>
          <GalleryWall posts={posts} size={size} />
          {hasMore && (
            <Link
              href={`/galerie?page=${page + 1}`}
              scroll={false}
              className="mt-5 flex h-[54px] items-center self-center rounded-full border border-deep px-7 text-sm font-semibold transition-colors hover:bg-card"
            >
              Voir plus de photos
            </Link>
          )}
        </>
      )}

      {shareHref && (
        <section className="mt-12 flex flex-col gap-3 rounded-[28px] bg-section p-5 text-deep lg:mt-[88px] lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:rounded-[40px] lg:px-11 lg:py-9">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-[1.625rem] leading-[1.05] lg:text-4xl">Tu portes une paire de chez nous ?</h2>
            <p className="text-[0.84375rem] text-section-ink lg:text-[0.9375rem]">Envoie-nous ta photo sur WhatsApp : elle peut apparaître ici, avec ton accord.</p>
          </div>
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] shrink-0 items-center justify-center gap-2.5 rounded-full bg-deep px-6 text-[0.9375rem] font-bold text-cream lg:h-14"
          >
            <MessageCircle className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Envoyer ma photo
          </a>
        </section>
      )}
    </div>
  );
}
