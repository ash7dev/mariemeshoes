import type { Metadata } from 'next';
import Link from 'next/link';
import { Images, Plus } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import GalleryAdminGrid from '@/features/gallery/components/GalleryAdminGrid';
import { listAdminGallery } from '@/features/gallery/queries';

export const metadata: Metadata = {
  title: 'Galerie · Administration',
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  ajoutee: 'Photo ajoutée à la galerie.',
  modifiee: 'Photo enregistrée.',
  supprimee: 'Photo supprimée. La paire reste dans le catalogue.',
};

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const posts = await listAdminGallery();
  const notice = ok ? NOTICES[ok] : undefined;
  const online = posts.filter((p) => p.isPublished && !p.pairHidden).length;

  const newButton = (
    <Link href="/admin/galerie/nouvelle" className="flex h-12 items-center gap-2 rounded-full bg-deep pl-4 pr-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90">
      <Plus className="size-[18px]" strokeWidth={2} aria-hidden="true" />
      Ajouter une photo
    </Link>
  );

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Galerie</h1>
          <p className="max-w-xl text-sm text-muted-ink">
            Des photos de paires portées, chacune reliée à sa paire : le client s’inspire puis va directement l’acheter.
            {posts.length > 0 && ` ${online} en ligne sur ${posts.length}.`}
          </p>
        </div>
        {posts.length > 0 && newButton}
      </header>

      {notice && (
        <p role="status" className="rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink">
          {notice}
        </p>
      )}

      {posts.length === 0 ? (
        <ListEmptyState
          icon={<Images strokeWidth={1.5} aria-hidden="true" />}
          tone="welcome"
          title="La galerie est vide"
          description="Ajoute une première photo de paire portée (envoyée par une cliente sur WhatsApp, par exemple) et relie-la à sa paire."
          action={newButton}
        />
      ) : (
        <GalleryAdminGrid posts={posts} />
      )}
    </div>
  );
}
