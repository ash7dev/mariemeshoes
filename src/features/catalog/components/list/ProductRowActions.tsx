'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LoaderCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setProductOnlineAction } from '../../actions';

type ProductRowActionsProps = {
  productId: string;
  productName: string;
  isActive: boolean;
};

/** Actions rapides d'une ligne : mettre en ligne / repasser en brouillon, modifier. */
export default function ProductRowActions({ productId, productName, isActive }: ProductRowActionsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () =>
    startTransition(async () => {
      setError(null);
      const result = await setProductOnlineAction(productId, !isActive);
      if (!result.ok) setError(result.error);
    });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-label={isActive ? `Repasser ${productName} en brouillon` : `Mettre ${productName} en ligne`}
          title={isActive ? 'Repasser en brouillon' : 'Mettre en ligne'}
          className={cn(
            'flex h-10 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors disabled:opacity-60',
            isActive ? 'border border-border hover:border-ink' : 'bg-accent text-white hover:opacity-90',
          )}
        >
          {pending ? (
            <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
          ) : isActive ? (
            <EyeOff className="size-4" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye className="size-4" strokeWidth={1.8} aria-hidden="true" />
          )}
          <span className="hidden xl:inline">{isActive ? 'Brouillon' : 'Publier'}</span>
        </button>
        <Link
          href={`/admin/produits/${productId}`}
          aria-label={`Modifier ${productName}`}
          title="Modifier"
          className="grid size-10 place-items-center rounded-full bg-deep text-cream transition-opacity hover:opacity-90"
        >
          <Pencil className="size-4" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
      {error && (
        <p role="alert" className="max-w-[16rem] text-right text-xs leading-snug text-accent-ink">
          {error}
        </p>
      )}
    </div>
  );
}
