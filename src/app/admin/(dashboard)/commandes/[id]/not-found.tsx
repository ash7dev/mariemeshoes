import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';

/** Commande introuvable (lien périmé ou mal saisi). */
export default function OrderNotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <ListEmptyState
        icon={<ReceiptText strokeWidth={1.5} aria-hidden="true" />}
        title="Commande introuvable"
        description="Cette commande n’existe pas. Le lien est peut-être incorrect : retrouve-la par sa référence dans la liste."
        action={
          <Link href="/admin/commandes" className="flex h-11 items-center rounded-full bg-deep px-5 text-sm font-semibold text-cream">
            Retour aux commandes
          </Link>
        }
      />
    </div>
  );
}
