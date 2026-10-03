import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers, Plus } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import CollectionList from '@/features/collections/components/CollectionList';
import { listAdminCollections } from '@/features/collections/queries';
import { refreshBestsellers } from '@/features/collections/services/bestsellers';

export const metadata: Metadata = {
  title: 'Collections · Administration',
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  creee: 'Collection créée.',
  supprimee: 'Collection supprimée. Les paires restent dans le catalogue.',
};

export default async function AdminCollectionsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  // Les meilleures ventes affichées ici sont à jour.
  await refreshBestsellers({ force: true }).catch((error) => console.error('Recalcul des meilleures ventes impossible', error));
  const collections = await listAdminCollections();
  const notice = ok ? NOTICES[ok] : undefined;

  const newButton = (
    <Link href="/admin/collections/nouvelle" className="flex h-12 items-center gap-2 rounded-full bg-deep pl-4 pr-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90">
      <Plus className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      Nouvelle collection
    </Link>
  );

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Collections</h1>
          <p className="max-w-xl text-sm text-muted-ink">
            Des sélections de paires mises en avant : Spécial Tabaski, Tendances, Petits prix… Les collections étoilées apparaissent sur l’accueil, dans cet ordre.
          </p>
        </div>
        {collections.length > 0 && newButton}
      </header>

      {notice && (
        <p role="status" className="rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink">
          {notice}
        </p>
      )}

      {collections.length === 0 ? (
        <ListEmptyState
          icon={<Layers strokeWidth={1.5} aria-hidden="true" />}
          tone="welcome"
          title="Aucune collection"
          description="Crée ta première sélection (ex. Spécial Tabaski) ou une collection « Meilleures ventes » qui se remplit toute seule."
          action={newButton}
        />
      ) : (
        <CollectionList collections={collections} />
      )}
    </div>
  );
}
