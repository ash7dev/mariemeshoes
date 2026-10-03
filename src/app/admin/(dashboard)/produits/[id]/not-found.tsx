import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';

/** Produit introuvable (lien périmé, produit supprimé, adresse mal saisie). */
export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <ListEmptyState
        icon={<PackageOpen strokeWidth={1.5} aria-hidden="true" />}
        title="Produit introuvable"
        description="Ce produit n’existe pas ou plus. Il a peut-être été supprimé, ou le lien est incorrect."
        action={
          <Link href="/admin/produits" className="flex h-11 items-center rounded-full bg-deep px-5 text-sm font-semibold text-cream">
            Retour aux produits
          </Link>
        }
      />
    </div>
  );
}
