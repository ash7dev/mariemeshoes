import Link from 'next/link';
import { Tag } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';

/** Promotion introuvable (supprimée, ou lien incorrect). */
export default function PromotionNotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <ListEmptyState
        icon={<Tag strokeWidth={1.5} aria-hidden="true" />}
        title="Promotion introuvable"
        description="Cette promotion n’existe pas ou plus. Elle a peut-être été supprimée."
        action={
          <Link href="/admin/promotions" className="flex h-11 items-center rounded-full bg-deep px-5 text-sm font-semibold text-cream">
            Retour aux promotions
          </Link>
        }
      />
    </div>
  );
}
