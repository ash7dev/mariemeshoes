'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, LoaderCircle, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle, inputClass } from '@/features/catalog/components/form-ui';
import { moveCatalogItemAction, renameCatalogItemAction, setCatalogItemActiveAction, type ActionResult } from '../actions';
import type { CatalogRow } from '../queries';
import { IconButton } from './DeliveryZonesManager';
import { ResultMessage, SettingsCard } from './settings-ui';

type Kind = 'brand' | 'category';

/**
 * Marques et catégories : créées depuis le formulaire produit, gérées ici
 * (nom, ordre dans les menus, visibilité en boutique).
 */
export default function CatalogManager({ brands, categories }: { brands: CatalogRow[]; categories: CatalogRow[] }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setResult(await fn());
    });

  return (
    <SettingsCard
      id="catalogue"
      title="Marques et catégories"
      description="Elles se créent en ajoutant un produit. Ici : leur nom, leur ordre dans les menus de la boutique, et leur visibilité."
    >
      {result && <ResultMessage ok={result.ok}>{result.ok ? result.message : result.error}</ResultMessage>}
      <div className="grid gap-6 lg:grid-cols-2">
        <CatalogList kind="brand" title="Marques" rows={brands} pending={pending} run={run} />
        <CatalogList kind="category" title="Catégories" rows={categories} pending={pending} run={run} />
      </div>
    </SettingsCard>
  );
}

function CatalogList({
  kind,
  title,
  rows,
  pending,
  run,
}: {
  kind: Kind;
  title: string;
  rows: CatalogRow[];
  pending: boolean;
  run: (fn: () => Promise<ActionResult>) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted-ink">({rows.length})</span>
      </h3>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-ink">
          Aucune {kind === 'brand' ? 'marque' : 'catégorie'} pour l’instant.{' '}
          <Link href="/admin/produits/nouveau" className="font-semibold text-accent-ink underline underline-offset-4">
            Ajoute un produit
          </Link>{' '}
          pour en créer.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {rows.map((row, index) => (
            <li key={row.id} className={cn('flex items-center gap-2 px-3 py-2.5', !row.isActive && 'bg-page')}>
              {editing === row.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(() => renameCatalogItemAction(kind, row.id, name));
                    setEditing(null);
                  }}
                  className="flex flex-1 items-center gap-1.5"
                >
                  <label htmlFor={`rename-${row.id}`} className="sr-only">
                    Nouveau nom
                  </label>
                  <input id={`rename-${row.id}`} value={name} autoFocus maxLength={60} onChange={(e) => setName(e.target.value)} className={cn(inputClass, 'h-10 border-border')} />
                  <IconButton label="Enregistrer le nom" onClick={() => {
                    run(() => renameCatalogItemAction(kind, row.id, name));
                    setEditing(null);
                  }}>
                    <Check className="size-4" strokeWidth={2} aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Annuler" onClick={() => setEditing(null)}>
                    <X className="size-4" strokeWidth={2} aria-hidden="true" />
                  </IconButton>
                </form>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className={cn('truncate font-medium', !row.isActive && 'text-muted-ink')}>{row.name}</span>
                    <span className="text-xs text-muted-ink">
                      {row.products} modèle{row.products > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Toggle checked={row.isActive} onChange={(isActive) => run(() => setCatalogItemActiveAction(kind, row.id, isActive))} label={row.isActive ? 'Visible' : 'Masquée'} />
                  <IconButton label="Monter" disabled={index === 0 || pending} onClick={() => run(() => moveCatalogItemAction(kind, row.id, -1))}>
                    <ArrowUp className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Descendre" disabled={index === rows.length - 1 || pending} onClick={() => run(() => moveCatalogItemAction(kind, row.id, 1))}>
                    <ArrowDown className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Renommer ${row.name}`}
                    onClick={() => {
                      setEditing(row.id);
                      setName(row.name);
                    }}
                  >
                    {pending ? <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : <Pencil className="size-4" strokeWidth={1.8} aria-hidden="true" />}
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
