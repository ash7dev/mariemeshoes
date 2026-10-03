import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopCollectionTile } from '../queries';

/** Tuile aubergine d'une collection en cours (Tabaski, Tendances…), insérée dans la grille. */
export default function CollectionTile({ tile, variant }: { tile: ShopCollectionTile; variant: 'desktop' | 'mobile' }) {
  const href = `/collections/${tile.slug}`;
  const label = `Voir ${tile.count === 1 ? 'la paire' : `les ${tile.count} paires`}`;

  if (variant === 'mobile') {
    return (
      <Link href={href} className="relative grid h-[168px] grid-cols-[minmax(0,1fr)_128px] overflow-hidden rounded-[26px] bg-deep p-[22px] text-cream">
        <span className="flex flex-col justify-between">
          <span className="flex flex-col gap-1.5">
            <span className="text-[0.625rem] font-bold tracking-[0.24em] text-accent-soft">COLLECTION</span>
            <span className="line-clamp-2 font-display text-[1.875rem] leading-none">{tile.name}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-accent-soft">
            {label}
            <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </span>
        <Visual tile={tile} className="size-[150px]" sizes="150px" />
      </Link>
    );
  }

  return (
    <Link href={href} className="group col-span-2 grid min-h-[27.5rem] grid-cols-2 overflow-hidden rounded-[28px] bg-deep text-cream">
      <span className="flex flex-col justify-between p-10">
        <span className="flex flex-col gap-3.5">
          <span className="text-[0.6875rem] font-bold tracking-[0.26em] text-accent-soft">COLLECTION</span>
          <span className="font-display text-[3.25rem] leading-none">{tile.name}</span>
          {tile.description && <span className="line-clamp-4 text-[0.9375rem] leading-relaxed text-deep-ink">{tile.description}</span>}
        </span>
        <span className="flex h-[50px] items-center gap-2.5 self-start rounded-full bg-accent px-6 text-sm font-semibold text-white transition-transform group-hover:scale-[1.03]">
          {label}
          <ArrowRight className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </span>
      <Visual tile={tile} className="size-[340px]" sizes="340px" />
    </Link>
  );
}

function Visual({ tile, className, sizes }: { tile: ShopCollectionTile; className: string; sizes: string }) {
  return (
    <span className="relative flex items-center justify-center">
      {/* Disque rose thé : le fond blanc de la photo s'y fond (multiply), ce qu'il ne ferait pas sur l'aubergine. */}
      <span className={cn('absolute rounded-full bg-section', className)} />
      {tile.imageUrl && (
        <span className={cn('relative -rotate-12', className)}>
          <Image src={tile.imageUrl} alt="" fill sizes={sizes} className="object-contain p-[12%] mix-blend-multiply" />
        </span>
      )}
    </span>
  );
}
