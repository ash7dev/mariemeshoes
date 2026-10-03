'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, Copy, LoaderCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/features/catalog/components/form-ui';
import { setPromotionActiveAction } from '../../actions';

/** Copier le code, activer / désactiver, modifier. */
export default function PromotionRowActions({ id, name, code, isActive }: { id: string; name: string; code: string | null; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {code && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setError('Copie impossible : sélectionne le code à la main.');
              }
            }}
            aria-label={copied ? 'Code copié' : `Copier le code ${code}`}
            title="Copier le code"
            className={cn('grid size-10 place-items-center rounded-full border transition-colors', copied ? 'border-[#1F6B3A] text-[#1F6B3A]' : 'border-border hover:border-ink')}
          >
            {copied ? <Check className="size-4" strokeWidth={2.2} aria-hidden="true" /> : <Copy className="size-4" strokeWidth={1.8} aria-hidden="true" />}
          </button>
        )}
        <div className={cn('flex items-center', pending && 'opacity-60')}>
          {pending && <LoaderCircle className="mr-1 size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          <Toggle
            checked={isActive}
            label={isActive ? 'Active' : 'Inactive'}
            onChange={(next) =>
              startTransition(async () => {
                setError(null);
                const result = await setPromotionActiveAction(id, next);
                if (!result.ok) setError(result.error);
              })
            }
          />
        </div>
        <Link
          href={`/admin/promotions/${id}`}
          aria-label={`Modifier ${name}`}
          title="Modifier"
          className="grid size-10 place-items-center rounded-full bg-deep text-cream transition-opacity hover:opacity-90"
        >
          <Pencil className="size-4" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
      {error && (
        <p role="alert" className="max-w-[16rem] text-right text-xs text-accent-ink">
          {error}
        </p>
      )}
    </div>
  );
}
