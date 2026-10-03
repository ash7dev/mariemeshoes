'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { deleteProductAction } from '../actions';

/**
 * Zone sensible de la fiche produit : suppression définitive du produit, de ses coloris,
 * photos, pointures et de son journal de stock. Les commandes passées gardent leur copie.
 */
export default function DeleteProductPanel({ productId, productName }: { productId: string; productName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${productName} » ?\n\nSes coloris, photos, pointures et son historique de stock seront effacés. Cette action est irréversible.`,
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(productId);
      // En cas de succès, l'action redirige vers la liste des produits.
      if (result && !result.ok) setError(result.error);
    });
  };

  return (
    <section aria-labelledby="delete-product-title" className="flex flex-col gap-4 rounded-[28px] border border-[#F2C6DA] bg-[#FDF3F7] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="flex flex-col gap-1.5">
        <h2 id="delete-product-title" className="font-display text-[1.375rem] leading-tight">
          Supprimer ce produit
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-ink">
          Efface le produit, ses coloris, ses photos, ses pointures et son historique de stock. Les commandes déjà passées gardent leur copie.
          Pour le retirer de la boutique sans rien perdre, passe-le plutôt en brouillon.
        </p>
        {error && (
          <p role="alert" className="text-sm font-medium text-accent-ink">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent-ink px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
        )}
        Supprimer définitivement
      </button>
    </section>
  );
}
