import { Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LOW_STOCK_THRESHOLD } from '@/features/admin/queries';
import type { DashboardData } from '../queries';
import { Panel, PanelEmpty } from './ui';

/**
 * Le mur des pointures (ordinateur) : une colonne par pointure, hauteur = paires en
 * stock (catalogue en ligne). Pointure star (la plus vendue sur 30 jours) surlignée
 * en rose, pointures en danger en magenta.
 */
export default function SizeWall({ wall }: { wall: DashboardData['wall'] }) {
  if (wall.catalogEmpty) {
    return (
      <Panel id="wall" title="Le mur des pointures">
        <PanelEmpty icon={<Footprints strokeWidth={1.5} aria-hidden="true" />} title="Aucune paire en ligne" action={{ href: '/admin/produits/nouveau', label: 'Ajouter un produit' }}>
          Le stock de chaque pointure, de 36 à 46, s’affichera ici dès qu’un produit sera publié.
        </PanelEmpty>
      </Panel>
    );
  }

  const max = Math.max(1, ...wall.cells.map((c) => c.stock));
  const star = wall.star?.size ?? null;

  return (
    <Panel id="wall" title="Le mur des pointures" aside={<span className="text-xs text-muted-ink">paires en stock · catalogue en ligne</span>}>
      <div className="grid h-[200px] items-end gap-2.5" style={{ gridTemplateColumns: `repeat(${wall.cells.length}, minmax(0, 1fr))` }}>
        {wall.cells.map((cell) => {
          const low = cell.stock <= LOW_STOCK_THRESHOLD;
          const isStar = cell.size === star;
          return (
            <div
              key={cell.size}
              title={`${cell.size} : ${cell.stock} paire${cell.stock > 1 ? 's' : ''} en stock · ${cell.sold} vendue${cell.sold > 1 ? 's' : ''} sur 30 jours`}
              className={cn('flex h-full flex-col items-center justify-end gap-2 rounded-2xl px-1 pt-2', isStar ? 'bg-section' : low ? 'bg-[#FBE3EE]' : '')}
            >
              <span className={cn('text-xs font-bold tabular-nums', low ? 'text-accent-ink' : 'text-muted-ink')}>{cell.stock}</span>
              <span className={cn('w-full rounded-t-xl rounded-b-[5px]', low ? 'bg-accent' : 'bg-deep')} style={{ height: `${Math.max(4, (cell.stock / max) * 130)}px` }} />
              <span className="pb-2 font-display text-[1.25rem] leading-none">{cell.size}</span>
            </div>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-section px-4 py-3.5">
          <span className="block text-xs text-section-ink">Pointure star</span>
          {wall.star ? (
            <>
              <strong className="font-display text-[1.625rem] font-normal">{wall.star.size}</strong>
              <span className="text-xs text-section-ink"> · {Math.round(wall.star.share * 100)} % des ventes (30 j)</span>
            </>
          ) : (
            <span className="text-sm text-section-ink">pas encore de vente</span>
          )}
        </div>
        <div className={cn('rounded-[20px] px-4 py-3.5', wall.outOfStock.length ? 'bg-[#FBE3EE] text-accent-ink' : 'bg-card text-muted-ink')}>
          <span className="block text-xs">Ruptures (36–46)</span>
          <strong className="font-display text-[1.625rem] font-normal">{wall.outOfStock.length ? wall.outOfStock.join(', ') : 'Aucune'}</strong>
        </div>
        <div className="rounded-[20px] bg-card px-4 py-3.5 text-muted-ink">
          <span className="block text-xs">Stock total</span>
          <strong className="font-display text-[1.625rem] font-normal text-ink">{wall.totalStock}</strong>
          <span className="text-xs"> paire{wall.totalStock > 1 ? 's' : ''} · {wall.models} coloris</span>
        </div>
      </div>
    </Panel>
  );
}
