import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowRight, ImageOff } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { formatFCFA } from '@/lib/money';
import { cn } from '@/lib/utils';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';
import { getCollectionPage, type CollectionPage } from '@/features/shop/collection-queries';
import { timerLabel } from '@/features/shop/collection-timer';
import SizeSync from '@/features/shop/components/SizeSync';
import SizeRibbon from '@/features/shop/components/SizeRibbon';
import ProductCard from '@/features/shop/components/ProductCard';
import ProductCardMobile from '@/features/shop/components/ProductCardMobile';
import CollectionHighlights from '@/features/shop/components/CollectionHighlights';
import CollectionTimer from '@/features/shop/components/CollectionTimer';
import ShareCollection from '@/features/shop/components/ShareCollection';

type Params = { params: Promise<{ slug: string }> };

const isSlug = (slug: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);
  if (!isSlug(slug)) return {};
  // Mêmes arguments que la page : une seule lecture en base (cache de requête).
  const page = await getCollectionPage(slug, parseSize(cookieStore.get(SIZE_COOKIE)?.value));
  if (!page) return { title: 'Collection introuvable' };
  const description =
    page.description ?? `${page.total} paires neuves${page.fromPrice ? ` dès ${formatFCFA(page.fromPrice)}` : ''}. Livraison partout au Sénégal, paiement Wave ou à la livraison.`;
  const image = page.coverUrl ?? page.fanImages[0];
  // L'aperçu WhatsApp reprend le titre, le texte et l'image : soigné pour les partages.
  return { title: page.name, description, openGraph: { title: page.name, description, images: image ? [{ url: image }] : undefined } };
}

/** Page d'une collection : l'affiche, les incontournables, toute la collection, les autres collections. */
export default async function CollectionRoute({ params }: Params) {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);
  if (!isSlug(slug)) notFound();
  const size = parseSize(cookieStore.get(SIZE_COOKIE)?.value);
  const page = await getCollectionPage(slug, size);
  if (!page) notFound();

  const url = `${siteConfig.url}/collections/${page.slug}`;

  return (
    <div className="flex flex-col pb-6">
      <SizeSync serverSize={size} />
      <Hero page={page} size={size} url={url} />

      <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-12 px-4 pt-10 lg:gap-28 lg:px-10 lg:pt-[72px]">
        {page.ended ? (
          <section className="flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-14 text-center">
            <h2 className="font-display text-[1.75rem] leading-tight lg:text-[2.25rem]">Cette collection est terminée</h2>
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-ink">Ses paires sont peut-être encore en boutique. Les nouvelles collections t’attendent juste en dessous.</p>
            <Link href="/boutique" className="mt-2 flex h-12 items-center rounded-full bg-deep px-6 text-sm font-semibold text-cream">
              Voir la boutique
            </Link>
          </section>
        ) : (
          <>
            {page.highlights.length > 0 && <CollectionHighlights highlights={page.highlights} size={size} />}

            {page.cards.length > 0 && (
              <section id="paires" aria-labelledby="all-title" className="flex scroll-mt-32 flex-col gap-4 lg:gap-7">
                <div className="flex items-end justify-between gap-6 px-1 lg:px-0">
                  <h2 id="all-title" className="font-display text-[2rem] leading-none lg:text-[3.5rem]">
                    Toute la collection
                  </h2>
                  <span className="shrink-0 text-sm text-muted-ink">
                    {page.total} paire{page.total > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="hidden lg:block">
                  <SizeRibbon size={size} counts={page.sizeCounts} variant="desktop" />
                </div>
                <div className="lg:hidden">
                  <SizeRibbon size={size} counts={page.sizeCounts} variant="mobile" />
                </div>
                <div className="hidden grid-cols-4 gap-6 lg:grid">
                  {page.cards.map((card) => (
                    <ProductCard key={card.id} card={card} size={size} />
                  ))}
                </div>
                <div className="flex flex-col gap-4 lg:hidden">
                  {page.cards.map((card) => (
                    <ProductCardMobile key={card.id} card={card} size={size} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {page.others.length > 0 && (
          <section aria-labelledby="others-title" className="flex flex-col gap-3 lg:gap-[26px]">
            <h2 id="others-title" className="px-1 font-display text-[1.875rem] leading-none lg:px-0 lg:text-[3rem]">
              Les autres collections
            </h2>
            <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5">
              {page.others.map((c, i) => (
                <li key={c.slug}>
                  <Link
                    href={`/collections/${c.slug}`}
                    className={cn(
                      'group flex h-[120px] items-center justify-between gap-3 rounded-[26px] py-3.5 pl-5 pr-3.5 lg:h-[200px] lg:rounded-[32px] lg:p-6',
                      ['bg-section text-deep', 'bg-deep text-cream', 'bg-card text-ink'][i % 3],
                    )}
                  >
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[0.625rem] font-bold uppercase tracking-[0.18em] opacity-80 lg:text-[0.6875rem] lg:tracking-[0.2em]">
                        {c.count} paire{c.count > 1 ? 's' : ''}
                      </span>
                      <span className="line-clamp-2 font-display text-2xl leading-[1.05] lg:text-[1.875rem]">{c.name}</span>
                    </span>
                    {/* Disque blanc : le fond des photos. */}
                    <span className="relative grid size-[92px] shrink-0 place-items-center overflow-hidden rounded-full bg-white lg:size-[150px]">
                      {c.imageUrl && (
                        <Image src={c.imageUrl} alt="" fill sizes="150px" className="-rotate-[10deg] object-contain p-2.5 transition-transform group-hover:scale-105" />
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** L'affiche : scène aubergine, la collection en grand, chiffres clés, partage, arche blanche. */
function Hero({ page, size, url }: { page: CollectionPage; size: number | null; url: string }) {
  const timer = page.endsAt ? timerLabel(page.endsAt, Date.now()) : null;
  const fan = page.fanImages;

  return (
    <section
      aria-labelledby="collection-title"
      className="mx-2 flex flex-col gap-3.5 rounded-[36px] bg-deep px-[18px] pb-5 pt-[22px] text-cream lg:mx-6 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-center lg:gap-16 lg:rounded-[48px] lg:px-14 lg:pb-12 lg:pt-10"
    >
      <div className="flex flex-col gap-3.5 lg:gap-[22px]">
        <nav aria-label="Fil d’Ariane" className="hidden gap-2 text-[0.8125rem] text-deep-ink lg:flex">
          <Link href="/" className="hover:text-cream">
            Accueil
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-cream">
            {page.name}
          </span>
        </nav>
        <p className="flex items-center gap-2.5 text-[0.65625rem] font-bold uppercase tracking-[0.22em] text-accent-soft lg:gap-3 lg:text-xs lg:tracking-[0.26em]">
          <span aria-hidden="true" className="size-2 rounded-full bg-accent shadow-[0_0_0_5px_rgba(230,0,126,0.25)] lg:size-2.5 lg:shadow-[0_0_0_6px_rgba(230,0,126,0.25)]" />
          <span>
            Collection
            {page.endsAt && timer && (
              <>
                {' · '}
                <CollectionTimer endsAt={page.endsAt} initial={timer} />
              </>
            )}
          </span>
        </p>
        <h1 id="collection-title" className="font-display text-[3.5rem] leading-[0.9] tracking-[-0.02em] lg:text-[7rem] lg:leading-[0.88]">
          {page.name}
        </h1>
        {page.description && <p className="max-w-[32.5rem] text-[0.90625rem] leading-normal text-deep-ink lg:text-lg">{page.description}</p>}

        {/* Mobile : l'arche entre le texte et les chiffres */}
        <div className="lg:hidden">
          <Arch page={page} fan={fan} />
        </div>

        {!page.ended && (
          <dl className="grid grid-cols-3 border-y border-deep-line lg:mt-2">
            <div className="flex flex-col gap-0.5 py-3 lg:gap-1 lg:py-[18px]">
              <dt className="text-[0.6875rem] text-deep-ink lg:text-xs">Paires</dt>
              <dd className="font-display text-[1.375rem] lg:text-[2.125rem]">{page.total}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-l border-deep-line py-3 pl-3 lg:gap-1 lg:py-[18px] lg:pl-6">
              <dt className="text-[0.6875rem] text-deep-ink lg:text-xs">À partir de</dt>
              <dd className="font-display text-[1.375rem] lg:text-[2.125rem]">{page.fromPrice ? formatFCFA(page.fromPrice).replace('FCFA', 'F') : '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-l border-deep-line py-3 pl-3 lg:gap-1 lg:py-[18px] lg:pl-6">
              <dt className="text-[0.6875rem] text-deep-ink lg:text-xs">{size === null ? 'Pointures' : `En ${size}`}</dt>
              <dd className="font-display text-[1.375rem] text-accent-soft lg:text-[2.125rem]">
                {size === null
                  ? page.sizeCounts.length > 0
                    ? `${page.sizeCounts[0].size}–${page.sizeCounts[page.sizeCounts.length - 1].size}`
                    : '—'
                  : page.inSize}
              </dd>
            </div>
          </dl>
        )}

        <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:pt-1.5">
          {!page.ended && page.cards.length > 0 && (
            <a
              href="#paires"
              className="hidden h-[58px] items-center gap-2.5 rounded-full bg-accent px-7 text-[0.9375rem] font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_20px_36px_-14px_rgba(230,0,126,0.8)] lg:flex"
            >
              {size === null ? 'Voir toutes les paires' : `Voir les paires en ${size}`}
              <ArrowDown className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </a>
          )}
          <ShareCollection name={page.name} url={url} />
        </div>
      </div>

      <div className="hidden lg:block">
        <Arch page={page} fan={fan} />
      </div>
    </section>
  );
}

/** Arche blanche : l'image de couverture, sinon les 3 premières paires en éventail. */
function Arch({ page, fan }: { page: CollectionPage; fan: string[] }) {
  return (
    <div className="relative mx-auto flex h-[330px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-[150px_150px_24px_24px] bg-white lg:h-[620px] lg:max-w-[520px] lg:rounded-[260px_260px_32px_32px]">
      {page.coverUrl ? (
        <Image src={page.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 520px, 300px" className="object-cover" />
      ) : fan.length === 0 ? (
        <ImageOff className="size-8 text-muted" strokeWidth={1.4} aria-hidden="true" />
      ) : (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-[140px_140px_16px_16px] border border-[#EFE8E0] lg:inset-3.5 lg:rounded-[246px_246px_22px_22px]" />
          <span aria-hidden="true" className="absolute bottom-[86px] h-6 w-[70%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(42,14,30,0.12),transparent)] lg:bottom-[150px] lg:h-10" />
          {fan[1] && (
            <span className="absolute -left-[4%] top-[70px] aspect-[4/3] w-[74%] -rotate-[18deg] lg:top-[130px]">
              <Image src={fan[1]} alt="" fill sizes="(min-width: 1024px) 390px, 220px" className="object-contain" />
            </span>
          )}
          {fan[2] && (
            <span className="absolute -right-[6%] top-[64px] aspect-[4/3] w-[74%] rotate-[14deg] lg:top-[120px]">
              <Image src={fan[2]} alt="" fill sizes="(min-width: 1024px) 390px, 220px" className="object-contain" />
            </span>
          )}
          <span className={cn('relative aspect-[4/3] w-[92%] -rotate-6', fan.length > 1 && 'mt-[90px] lg:mt-[150px]')}>
            <Image src={fan[0]} alt="" fill priority sizes="(min-width: 1024px) 480px, 280px" className="object-contain" />
          </span>
        </>
      )}
      {!page.ended && (
        <Link
          href="#paires"
          aria-label="Voir les paires"
          className="absolute bottom-3.5 right-3.5 grid size-[46px] place-items-center rounded-full bg-deep text-cream lg:bottom-6 lg:right-6 lg:size-14"
        >
          <ArrowRight className="size-5 rotate-90" strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
