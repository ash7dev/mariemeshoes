'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardData } from '../../queries';
import { PanelEmpty } from '../ui';

/**
 * Le mur des pointures, version mobile : une tuile par pointure avec une jauge
 * de stock (remplissage), la pointure star et les tailles en danger signalées.
 * Toucher une taille affiche les modèles disponibles dans cette pointure.
 */
export default function SizeWallMobile({ wall, lowThreshold }: { wall: DashboardData['wall']; lowThreshold: number }) {
  const starSize = wall.star?.size ?? null;
  const [selected, setSelected] = useState<number>(() => starSize ?? wall.cells.find((c) => c.stock > 0)?.size ?? wall.cells[0]?.size ?? 43);

  if (wall.catalogEmpty) {
    return (
      <section aria-labelledby="wall-m-title" className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-[18px]">
        <h2 id="wall-m-title" className="font-display text-[1.375rem]">
          Le mur des pointures
        </h2>
        <PanelEmpty icon={<Footprints strokeWidth={1.5} aria-hidden="true" />} title="Aucune paire en ligne" action={{ href: '/admin/produits/nouveau', label: 'Ajouter un produit' }}>
          Le stock de chaque pointure s’affichera ici.
        </PanelEmpty>
      </section>
    );
  }

  const max = Math.max(1, ...wall.cells.map((c) => c.stock));
  const cell = wall.cells.find((c) => c.size === selected) ?? wall.cells[0];
  const low = cell.stock <= lowThreshold;
  const isStar = cell.size === starSize;

  return (
    <section aria-labelledby="wall-m-title" className="flex flex-col gap-3.5 rounded-[28px] border border-border bg-surface p-[18px]">
      <div className="flex items-baseline justify-between">
        <h2 id="wall-m-title" className="font-display text-[1.375rem]">
          Le mur des pointures
        </h2>
        <span className="text-xs text-muted-ink">touche une taille</span>
      </div>

      <div role="radiogroup" aria-label="Pointures" className="grid grid-cols-6 gap-1.5">
        {wall.cells.map((c) => {
          const on = c.size === cell.size;
          const danger = c.stock <= lowThreshold;
          return (
            <button
              key={c.size}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${c.size} : ${c.stock} paire${c.stock > 1 ? 's' : ''}${c.size === starSize ? ', pointure star' : ''}`}
              onClick={() => setSelected(c.size)}
              className={cn(
                'relative flex h-16 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl transition-colors',
                on ? 'bg-deep text-cream' : danger ? 'bg-[#FBE3EE] text-accent-ink' : c.size === starSize ? 'bg-section text-deep' : 'bg-card text-ink',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('absolute inset-x-0 bottom-0', on ? 'bg-accent-soft/25' : danger ? 'bg-accent/15' : 'bg-deep/[0.07]')}
                style={{ height: `${Math.min(100, (c.stock / max) * 100)}%` }}
              />
              <span className="relative font-display text-[1.1875rem] leading-none">{c.size}</span>
              <span className="relative text-[0.6875rem] font-bold">{c.stock === 0 ? 'épuisé' : `${c.stock} p.`}</span>
              {c.size === starSize && !on && <span aria-hidden="true" className="absolute right-1.5 top-1 text-[0.625rem]">★</span>}
            </button>
          );
        })}
      </div>

      <div className={cn('flex flex-col gap-2.5 rounded-[20px] p-3.5', low ? 'bg-[#FBE3EE] text-accent-ink' : isStar ? 'bg-section' : 'bg-card')}>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[1.875rem] leading-none">{cell.size}</span>
          <span className="text-[0.8125rem]">
            {cell.stock === 0
              ? 'épuisée sur tous les modèles'
              : `${cell.stock} paire${cell.stock > 1 ? 's' : ''} · ${cell.models.length} modèle${cell.models.length > 1 ? 's' : ''}`}
            {isStar ? ' · pointure star' : ''}
          </span>
        </div>
        {cell.models.map((m) => (
          <div key={m.name} className={cn('flex justify-between gap-3 border-t pt-2 text-[0.8125rem]', low ? 'border-accent-ink/20' : 'border-border')}>
            <span className="truncate">{m.name}</span>
            <strong className="shrink-0">{m.stock} p.</strong>
          </div>
        ))}
        {cell.sold > 0 && <span className="text-xs opacity-80">{cell.sold} vendue{cell.sold > 1 ? 's' : ''} ces 30 derniers jours</span>}
        <Link href={low ? '/admin/produits?statut=stock-bas' : '/admin/produits'} className="text-[0.8125rem] font-bold">
          {low ? 'Réassortir →' : 'Voir les produits →'}
        </Link>
      </div>
    </section>
  );
}
