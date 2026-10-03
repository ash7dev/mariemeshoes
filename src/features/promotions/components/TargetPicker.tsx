'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, ImageOff, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PromotionFormOptions, TargetOption } from '../admin-queries';

export type Targets = { brandIds: string[]; categoryIds: string[]; collectionIds: string[]; colorwayIds: string[] };

const TABS = [
  { key: 'brandIds', option: 'brands', label: 'Marques', empty: 'Aucune marque pour l’instant : elles sont créées avec les produits.' },
  { key: 'categoryIds', option: 'categories', label: 'Catégories', empty: 'Aucune catégorie pour l’instant : elles sont créées avec les produits.' },
  { key: 'collectionIds', option: 'collections', label: 'Collections', empty: 'Aucune collection pour l’instant.' },
  { key: 'colorwayIds', option: 'colorways', label: 'Coloris', empty: 'Aucun coloris pour l’instant : ajoute d’abord des produits.' },
] as const;

type TargetPickerProps = {
  options: PromotionFormOptions;
  value: Targets;
  onChange: (targets: Targets) => void;
  error?: string;
};

/** Choix des cibles d'une promotion : marques, catégories, collections, coloris (recherche + cases). */
export default function TargetPicker({ options, value, onChange, error }: TargetPickerProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [query, setQuery] = useState('');

  const list: readonly TargetOption[] = options[tab.option];
  const selected = new Set(value[tab.key]);
  const q = query.trim().toLowerCase();
  const filtered = q ? list.filter((o) => o.label.toLowerCase().includes(q)) : list;

  const toggle = (id: string) =>
    onChange({ ...value, [tab.key]: selected.has(id) ? value[tab.key].filter((v) => v !== id) : [...value[tab.key], id] });

  // Résumé de toutes les cibles choisies (toutes catégories confondues).
  const chosen = TABS.flatMap((t) =>
    value[t.key].map((id) => ({ key: t.key, id, label: options[t.option].find((o) => o.id === id)?.label ?? 'Élément supprimé', kind: t.label })),
  );

  return (
    <div className="flex flex-col gap-3">
      {chosen.length > 0 && (
        <ul aria-label="Cibles choisies" className="flex flex-wrap gap-1.5">
          {chosen.map((item) => (
            <li key={`${item.key}-${item.id}`}>
              <button
                type="button"
                onClick={() => onChange({ ...value, [item.key]: value[item.key].filter((v) => v !== item.id) })}
                aria-label={`Retirer ${item.label}`}
                className="flex h-8 items-center gap-1.5 rounded-full bg-deep pl-3 pr-2 text-xs font-medium text-cream hover:opacity-90"
              >
                <span className="text-deep-ink">{item.kind.slice(0, -1)} ·</span>
                {item.label}
                <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={cn('overflow-hidden rounded-2xl border bg-page', error ? 'border-accent-ink' : 'border-border')}>
        <div role="tablist" aria-label="Type de cible" className="flex gap-1 overflow-x-auto border-b border-border p-1.5">
          {TABS.map((t) => {
            const count = value[t.key].length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab.key === t.key}
                onClick={() => {
                  setTab(t);
                  setQuery('');
                }}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium',
                  tab.key === t.key ? 'bg-surface shadow-sm' : 'text-muted-ink hover:text-ink',
                )}
              >
                {t.label}
                {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem] font-bold text-white">{count}</span>}
              </button>
            );
          })}
        </div>

        {list.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-ink">{tab.empty}</p>
        ) : (
          <>
            {list.length > 6 && (
              <div className="relative border-b border-border">
                <label htmlFor="target-search" className="sr-only">
                  Rechercher dans {tab.label.toLowerCase()}
                </label>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-ink" strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="target-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Rechercher dans ${tab.label.toLowerCase()}…`}
                  className="h-11 w-full bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-muted"
                />
              </div>
            )}
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-ink">Rien ne correspond à « {query} ».</li>}
              {filtered.map((option) => {
                const on = selected.has(option.id);
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(option.id)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors', on ? 'bg-section/60' : 'hover:bg-card')}
                    >
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border', on ? 'border-accent bg-accent text-white' : 'border-border bg-surface')}>
                        {on && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                      </span>
                      {tab.key === 'colorwayIds' && (
                        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-card">
                          {option.imageUrl ? (
                            <Image src={option.imageUrl} alt="" width={72} height={72} sizes="36px" className="size-full object-contain mix-blend-multiply" />
                          ) : (
                            <ImageOff className="size-4 text-muted-ink" strokeWidth={1.6} aria-hidden="true" />
                          )}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.hint && <span className="shrink-0 text-xs text-muted-ink">{option.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {error && <p className="text-sm text-accent-ink">{error}</p>}
    </div>
  );
}
