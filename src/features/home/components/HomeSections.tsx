import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import type { HomeBrand, HomeCollection } from '../queries';

const ENGAGEMENTS = ['Paires 100 % neuves', 'Wave ou à la livraison', 'Livrées partout au Sénégal', 'Conseils sur WhatsApp'];

/** Bandeau typographique sous la scène. */
export function Engagements() {
  return (
    <ul
      aria-label="Nos engagements"
      className="mx-5 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 py-[18px] font-display text-base text-deep lg:mx-6 lg:gap-x-9 lg:py-[22px] lg:text-[1.375rem]"
    >
      {ENGAGEMENTS.map((text, i) => (
        <li key={text} className={cn('flex items-center gap-3.5 lg:gap-9', i === 3 && 'hidden lg:flex')}>
          {i > 0 && (
            <span aria-hidden="true" className="text-accent">
              ✦
            </span>
          )}
          {text}
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ id, children, href, linkLabel }: { id: string; children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <h2 id={id} className="font-display text-[2rem] leading-none lg:text-[3.5rem]">
        {children}
      </h2>
      {href && (
        <Link href={href} className="hidden shrink-0 text-sm font-semibold text-accent-ink hover:underline lg:block">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

type TileStyle = 'rose' | 'deep' | 'accent' | 'sand';

/** Styles et emplacements de la mosaïque selon le nombre de collections (1 à 4). */
const LAYOUTS: Record<number, Array<{ style: TileStyle; desktop: string; mobile: string }>> = {
  1: [{ style: 'rose', desktop: 'col-span-4 row-span-2', mobile: 'col-span-2 h-[230px]' }],
  2: [
    { style: 'rose', desktop: 'col-span-2 row-span-2', mobile: 'col-span-2 h-[230px]' },
    { style: 'deep', desktop: 'col-span-2 row-span-2', mobile: 'col-span-2 h-[170px]' },
  ],
  3: [
    { style: 'rose', desktop: 'col-span-2 row-span-2', mobile: 'col-span-2 h-[230px]' },
    { style: 'deep', desktop: 'col-span-2', mobile: 'h-[170px]' },
    { style: 'accent', desktop: 'col-span-2', mobile: 'h-[170px]' },
  ],
  4: [
    { style: 'rose', desktop: 'col-span-2 row-span-2', mobile: 'col-span-2 h-[230px]' },
    { style: 'deep', desktop: '', mobile: 'h-[170px]' },
    { style: 'accent', desktop: '', mobile: 'h-[170px]' },
    { style: 'sand', desktop: 'col-span-2', mobile: 'col-span-2 h-[130px]' },
  ],
};

/** Mosaïque des collections : chaque photo (fond blanc) est posée sur une surface claire. */
export function CollectionsBento({ collections }: { collections: HomeCollection[] }) {
  const layout = LAYOUTS[collections.length];
  if (!layout) return null;
  return (
    <section aria-labelledby="home-collections" className="flex flex-col gap-4 lg:gap-7">
      <SectionTitle id="home-collections" href="/boutique" linkLabel="Toute la boutique">
        Choisis ton style
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:grid-rows-[270px_270px] lg:gap-5">
        {collections.map((c, i) => (
          <Tile key={c.slug} collection={c} style={layout[i].style} className={cn(layout[i].mobile, 'lg:h-auto', layout[i].desktop)} big={i === 0} />
        ))}
      </div>
    </section>
  );
}

function Tile({ collection: c, style, className, big }: { collection: HomeCollection; style: TileStyle; className: string; big: boolean }) {
  const href = `/collections/${c.slug}`;
  const count = `${c.count} paire${c.count > 1 ? 's' : ''}`;

  if (style === 'deep') {
    return (
      <Link href={href} className={cn('relative flex flex-col justify-between overflow-hidden rounded-[26px] bg-deep p-4 text-cream lg:rounded-[36px] lg:p-[22px]', className)}>
        {/* Disque clair : le fond blanc de la photo s'y fond, pas sur l'aubergine. */}
        <span aria-hidden="true" className="absolute -right-5 -top-3.5 grid size-[116px] place-items-center overflow-hidden rounded-full bg-card lg:-right-6 lg:top-8 lg:size-[170px]">
          {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="170px" className="object-contain p-[10%] mix-blend-multiply" />}
        </span>
        <span className="relative text-[0.625rem] font-bold uppercase tracking-[0.18em] text-accent-soft lg:text-[0.6875rem] lg:tracking-[0.2em]">{count}</span>
        <span className="relative line-clamp-2 max-w-[70%] font-display text-[1.3125rem] leading-[1.05] lg:text-[1.875rem]">{c.name}</span>
      </Link>
    );
  }

  if (style === 'accent') {
    return (
      <Link href={href} className={cn('flex flex-col justify-between rounded-[26px] bg-accent p-4 text-white lg:rounded-[36px] lg:p-[22px]', className)}>
        <span className="font-display text-[2.5rem] leading-none lg:text-[4rem]">
          {c.count}
          <span className="ml-1.5 text-base lg:text-xl">paire{c.count > 1 ? 's' : ''}</span>
        </span>
        <span className="line-clamp-2 font-display text-[1.1875rem] leading-[1.1] lg:text-[1.625rem]">{c.name}</span>
      </Link>
    );
  }

  if (style === 'sand') {
    return (
      <Link href={href} className={cn('flex items-center justify-between gap-2.5 overflow-hidden rounded-[26px] bg-card py-3.5 pl-5 pr-4 lg:rounded-[36px] lg:px-[30px] lg:py-6', className)}>
        <span className="flex min-w-0 flex-col gap-0.5 lg:gap-1.5">
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-ink lg:text-[0.6875rem] lg:tracking-[0.2em]">{count}</span>
          <span className="line-clamp-2 font-display text-[1.375rem] leading-[1.1] lg:text-[2.125rem]">{c.name}</span>
        </span>
        {c.imageUrl && (
          <span className="relative aspect-[4/3] w-[130px] shrink-0 -rotate-6 lg:w-[260px]">
            <Image src={c.imageUrl} alt="" fill sizes="260px" className="object-contain mix-blend-multiply" />
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link href={href} className={cn('group relative flex flex-col justify-end gap-1 overflow-hidden rounded-[30px] bg-section p-5 text-deep lg:justify-between lg:rounded-[36px] lg:p-8', className)}>
      {c.imageUrl && (
        <span className={cn('absolute aspect-[4/3] -rotate-[8deg]', big ? '-right-2.5 top-1.5 w-[64%] lg:left-[10%] lg:right-auto lg:top-[22%] lg:w-[80%]' : 'right-0 top-0 w-1/2')}>
          <Image src={c.imageUrl} alt="" fill sizes="(min-width: 1024px) 520px, 60vw" className="object-contain mix-blend-multiply" />
        </span>
      )}
      <span className="relative text-[0.65625rem] font-bold uppercase tracking-[0.18em] lg:text-xs lg:tracking-[0.2em]">
        <span className="hidden lg:inline">Collection · </span>
        {count}
      </span>
      <span className="relative flex items-end justify-between gap-4">
        <span className="flex min-w-0 flex-col gap-2">
          <span className="font-display text-[2.25rem] leading-none lg:text-[3.375rem] lg:leading-[0.95]">{c.name}</span>
          {c.description && (
            <span className="hidden lg:block">
              <span className="line-clamp-2 text-[0.9375rem]">{c.description}</span>
            </span>
          )}
        </span>
        <span aria-hidden="true" className="hidden size-14 shrink-0 place-items-center rounded-full bg-deep text-cream transition-transform group-hover:scale-105 lg:grid">
          <ArrowRight className="size-5" strokeWidth={2} />
        </span>
      </span>
    </Link>
  );
}

/** Le mur des marques : les plus fournies, nombre de paires et prix d'entrée. */
export function BrandsWall({ brands }: { brands: HomeBrand[] }) {
  if (brands.length === 0) return null;
  return (
    <section aria-labelledby="home-brands" className="flex flex-col gap-4 lg:gap-[26px]">
      <SectionTitle id="home-brands" href="/marques" linkLabel="Toutes les marques">
        Les marques
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[26px] border border-border bg-border lg:grid-cols-4 lg:rounded-[32px]">
        {brands.map((b) => (
          <li key={b.slug} className="bg-surface">
            <Link href={`/boutique?marque=${b.slug}`} className="group flex h-[92px] flex-col justify-between px-4 py-3.5 lg:h-[150px] lg:px-6 lg:py-[22px]">
              <span className="text-[0.6875rem] font-semibold text-muted-ink lg:text-xs">
                {b.count} paire{b.count > 1 ? 's' : ''}
                <span className="hidden lg:inline"> · dès {formatFCFA(b.fromPrice)}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-[1.375rem] lg:text-[2.125rem]">{b.name}</span>
                <ArrowUpRight className="hidden size-5 shrink-0 text-accent-ink transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 lg:block" strokeWidth={2} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/marques" className="flex h-[52px] items-center justify-center rounded-full border border-deep text-sm font-semibold lg:hidden">
        Toutes les marques
      </Link>
    </section>
  );
}
