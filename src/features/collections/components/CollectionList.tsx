'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Eye, EyeOff, LoaderCircle, Pencil, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveCollectionOnHomeAction, setCollectionActiveAction } from '../actions';
import type { AdminCollectionRow } from '../queries';
import { COLLECTION_TYPE_LABEL, collectionStatus } from '../schemas';

const TONE: Record<ReturnType<typeof collectionStatus>['tone'], string> = {
  live: 'bg-deep text-cream',
  scheduled: 'bg-section text-section-ink',
  ended: 'border border-border text-muted-ink',
  off: 'border border-border text-muted-ink',
};

/**
 * Liste des collections : celles mises en avant d'abord, dans l'ordre de l'accueil
 * (↑ ↓ pour le changer), puis les autres. Chaque ligne dit si la collection est
 * vraiment visible en boutique.
 */
export default function CollectionList({ collections }: { collections: AdminCollectionRow[] }) {
  const featured = collections.filter((c) => c.showOnHome);
  return (
    <ul className="flex flex-col gap-3">
      {collections.map((collection) => (
        <CollectionRow
          key={collection.id}
          collection={collection}
          homeIndex={collection.showOnHome ? featured.indexOf(collection) : -1}
          homeCount={featured.length}
        />
      ))}
    </ul>
  );
}

function CollectionRow({ collection, homeIndex, homeCount }: { collection: AdminCollectionRow; homeIndex: number; homeCount: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = collectionStatus(collection);
  const auto = collection.type === 'AUTO_BESTSELLERS';
  const invisible = status.tone === 'live' && collection.visiblePairs === 0;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? 'Action impossible.');
    });

  return (
    <li className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <Link href={`/admin/collections/${collection.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        {/* Mosaïque des premières paires */}
        <span className="grid size-[72px] shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-2xl bg-card p-1">
          {collection.thumbnails.length === 0 ? (
            <span className="col-span-2 grid place-items-center text-[0.625rem] font-medium text-muted-ink">{auto ? 'Auto' : 'Vide'}</span>
          ) : (
            collection.thumbnails.map((url) => (
              <span key={url} className={cn('relative overflow-hidden rounded-lg bg-surface', collection.thumbnails.length === 1 && 'col-span-2 row-span-2')}>
                <Image src={url} alt="" fill sizes="36px" className="object-contain mix-blend-multiply" />
              </span>
            ))
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[0.96875rem] font-semibold hover:text-accent-ink">{collection.name}</span>
            {collection.showOnHome && <Star className="size-4 shrink-0 fill-accent text-accent" strokeWidth={1.8} aria-label="Mise en avant" />}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-ink">
            <span className="flex items-center gap-1">
              {auto && <Sparkles className="size-3.5" strokeWidth={1.8} aria-hidden="true" />}
              {COLLECTION_TYPE_LABEL[collection.type]}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {collection.pairs} paire{collection.pairs > 1 ? 's' : ''}
              {collection.pairs > 0 && collection.visiblePairs !== collection.pairs && ` (${collection.visiblePairs} en boutique)`}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold', TONE[status.tone])}>{status.label}</span>
            {invisible && <span className="text-xs font-medium text-accent-ink">Invisible : aucune paire en ligne</span>}
          </span>
        </span>
      </Link>

      <div className="flex items-center justify-end gap-1.5">
        {collection.showOnHome && homeCount > 1 && (
          <span className="mr-1 flex items-center rounded-full bg-card p-0.5" role="group" aria-label={`Ordre de mise en avant : ${homeIndex + 1} sur ${homeCount}`}>
            <button
              type="button"
              disabled={pending || homeIndex === 0}
              onClick={() => run(() => moveCollectionOnHomeAction(collection.id, 'up'))}
              aria-label={`Monter ${collection.name}`}
              className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:opacity-30"
            >
              <ArrowUp className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="w-5 text-center text-xs font-semibold tabular-nums">{homeIndex + 1}</span>
            <button
              type="button"
              disabled={pending || homeIndex === homeCount - 1}
              onClick={() => run(() => moveCollectionOnHomeAction(collection.id, 'down'))}
              aria-label={`Descendre ${collection.name}`}
              className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:opacity-30"
            >
              <ArrowDown className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setCollectionActiveAction(collection.id, !collection.isActive))}
          aria-label={collection.isActive ? `Désactiver ${collection.name}` : `Activer ${collection.name}`}
          title={collection.isActive ? 'Désactiver' : 'Activer'}
          className={cn(
            'flex h-10 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors disabled:opacity-60',
            collection.isActive ? 'border border-border hover:border-ink' : 'bg-accent text-white hover:opacity-90',
          )}
        >
          {pending ? (
            <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
          ) : collection.isActive ? (
            <EyeOff className="size-4" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye className="size-4" strokeWidth={1.8} aria-hidden="true" />
          )}
          <span className="hidden xl:inline">{collection.isActive ? 'Désactiver' : 'Activer'}</span>
        </button>
        <Link
          href={`/admin/collections/${collection.id}`}
          aria-label={`Modifier ${collection.name}`}
          title="Modifier"
          className="grid size-10 place-items-center rounded-full bg-deep text-cream transition-opacity hover:opacity-90"
        >
          <Pencil className="size-4" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-xs text-accent-ink sm:basis-full">
          {error}
        </p>
      )}
    </li>
  );
}
