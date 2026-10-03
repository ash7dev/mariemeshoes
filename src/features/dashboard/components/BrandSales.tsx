'use client';

import { useState } from 'react';
import { Tags } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardData } from '../queries';
import { num } from '../format';
import { Panel, PanelEmpty } from './ui';

const COLORS = ['bg-deep', 'bg-accent', 'bg-accent-soft', 'bg-[#D5CABE]', 'bg-muted', 'bg-section'];

/** Ventes par marque sur la période, en paires ou en FCFA. */
export default function BrandSales({ brands, periodLabel }: { brands: DashboardData['brands']; periodLabel: string }) {
  const [unit, setUnit] = useState<'pairs' | 'fcfa'>('pairs');
  const max = Math.max(1, ...brands.map((b) => b[unit]));

  return (
    <Panel
      id="brands"
      title="Par marque"
      aside={
        brands.length > 0 ? (
          <div role="radiogroup" aria-label="Unité" className="flex gap-1 rounded-full bg-card p-1">
            {(['pairs', 'fcfa'] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                onClick={() => setUnit(u)}
                className={cn('h-8 rounded-full px-3.5 text-[0.8125rem] font-semibold', unit === u ? 'bg-surface shadow-sm' : 'text-muted-ink')}
              >
                {u === 'pairs' ? 'Paires' : 'FCFA'}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {brands.length === 0 ? (
        <PanelEmpty icon={<Tags strokeWidth={1.5} aria-hidden="true" />} title={`Aucune vente · ${periodLabel.toLowerCase()}`}>
          Les marques qui se vendent le mieux s’afficheront ici.
        </PanelEmpty>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {brands.map((brand, index) => (
            <li key={brand.name} className="grid grid-cols-[7rem_minmax(0,1fr)_7.5rem] items-center gap-3.5">
              <span className="truncate text-sm font-semibold">{brand.name}</span>
              <span className="h-3 overflow-hidden rounded-full bg-card">
                <span className={cn('block h-full rounded-full transition-[width] duration-300', COLORS[index % COLORS.length])} style={{ width: `${(brand[unit] / max) * 100}%` }} />
              </span>
              <span className="text-right text-[0.8125rem] tabular-nums text-muted-ink">
                {unit === 'pairs' ? `${brand.pairs} paire${brand.pairs > 1 ? 's' : ''}` : `${num(brand.fcfa)} F`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
