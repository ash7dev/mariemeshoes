import Link from 'next/link';
import { UserRound } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';

/** Client introuvable (lien périmé ou mal saisi). */
export default function CustomerNotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <ListEmptyState
        icon={<UserRound strokeWidth={1.5} aria-hidden="true" />}
        title="Client introuvable"
        description="Cette fiche client n’existe pas. Retrouve le client par son nom ou son numéro dans la liste."
        action={
          <Link href="/admin/clients" className="flex h-11 items-center rounded-full bg-deep px-5 text-sm font-semibold text-cream">
            Retour aux clients
          </Link>
        }
      />
    </div>
  );
}
