'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { DashboardData } from '../queries';
import { Panel, PanelEmpty } from './ui';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SLOTS = ['0 h', '3 h', '6 h', '9 h', '12 h', '15 h', '18 h', '21 h'];

/** Quand tes clients commandent : jour × tranche de 3 h, sur les 90 derniers jours. */
export default function OrderHeatmap({ heatmap }: { heatmap: DashboardData['heatmap'] }) {
  const max = Math.max(1, ...heatmap.grid.flat());
  // Case choisie par défaut : la plus chargée.
  const [cell, setCell] = useState<[number, number]>(() => {
    let best: [number, number] = [0, 0];
    heatmap.grid.forEach((row, d) => row.forEach((n, s) => n > heatmap.grid[best[0]][best[1]] && (best = [d, s])));
    return best;
  });
  const [d, s] = cell;
  const n = heatmap.grid[d][s];

  return (
    <Panel
      id="heatmap"
      title="Quand tes clients commandent"
      aside={
        heatmap.total > 0 ? (
          <span className="text-[0.8125rem] font-semibold text-accent-ink">
            {DAYS_LONG[d]} {s * 3} h–{s * 3 + 3} h : {n} commande{n > 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      {heatmap.total === 0 ? (
        <PanelEmpty icon={<Clock strokeWidth={1.5} aria-hidden="true" />} title="Pas encore assez de commandes">
          Les jours et heures où tes clients commandent le plus apparaîtront ici : utile pour publier sur Instagram au bon moment.
        </PanelEmpty>
      ) : (
        <>
          <div className="grid grid-cols-[2.5rem_repeat(8,minmax(0,1fr))] gap-1.5 text-[0.71875rem] text-muted-ink">
            <span />
            {SLOTS.map((slot) => (
              <span key={slot} className="text-center">
                {slot}
              </span>
            ))}
            {heatmap.grid.map((row, day) => (
              <div key={day} className="contents">
                <span className="flex items-center font-semibold">{DAYS[day]}</span>
                {row.map((count, slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setCell([day, slot])}
                    aria-label={`${DAYS_LONG[day]} ${slot * 3} h – ${slot * 3 + 3} h : ${count} commande${count > 1 ? 's' : ''}`}
                    aria-pressed={day === d && slot === s}
                    className="h-7 rounded-lg outline-offset-1 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-deep"
                    style={{ background: count === 0 ? 'var(--color-card)' : `rgb(230 0 126 / ${(0.15 + (count / max) * 0.85).toFixed(2)})` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[0.71875rem] text-muted-ink">
            <span>90 derniers jours · heure de Dakar</span>
            <span className="flex items-center gap-1.5">
              Moins
              <span className="size-3.5 rounded bg-card" />
              <span className="size-3.5 rounded bg-accent/30" />
              <span className="size-3.5 rounded bg-accent/60" />
              <span className="size-3.5 rounded bg-accent" />
              Plus
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}
