import Link from 'next/link';
import { Layers } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';

/** Collection introuvable (supprimée, ou lien incorrect). */
export default function CollectionNotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <ListEmptyState
        icon={<Layers strokeWidth={1.5} aria-hidden="true" />}
        title="Collection introuvable"
        description="Cette collection n’existe pas ou plus. Elle a peut-être été supprimée."
        action={
          <Link href="/admin/collections" className="flex h-11 items-center rounded-full bg-deep px-5 text-sm font-semibold text-cream">
            Retour aux collections
          </Link>
        }
      />
    </div>
  );
}
