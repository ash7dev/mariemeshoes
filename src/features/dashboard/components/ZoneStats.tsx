import { Truck } from 'lucide-react';
import type { DashboardData } from '../queries';
import { num } from '../format';
import { Panel, PanelEmpty } from './ui';

/** Livraisons par zone sur la période (commandes non annulées), avec les frais actuels. */
export default function ZoneStats({ zones, periodLabel }: { zones: DashboardData['zones']; periodLabel: string }) {
  const max = Math.max(1, ...zones.rows.map((z) => z.orders));
  return (
    <Panel id="zones" title="Livraisons par zone" aside={<span className="text-xs text-muted-ink">{periodLabel.toLowerCase()}</span>}>
      {zones.rows.length === 0 ? (
        zones.zonesConfigured === 0 ? (
          <PanelEmpty icon={<Truck strokeWidth={1.5} aria-hidden="true" />} title="Aucune zone de livraison" action={{ href: '/admin/parametres#livraison', label: 'Ajouter mes zones' }}>
            Sans zone, les clients ne peuvent pas choisir où être livrés.
          </PanelEmpty>
        ) : (
          <PanelEmpty icon={<Truck strokeWidth={1.5} aria-hidden="true" />} title="Aucune livraison sur la période" action={{ href: '/admin/parametres#livraison', label: 'Voir mes zones' }}>
            La répartition des commandes par zone s’affichera ici.
          </PanelEmpty>
        )
      ) : (
        <ul className="flex flex-col gap-3.5">
          {zones.rows.map((zone) => (
            <li key={zone.name} className="grid grid-cols-[10rem_minmax(0,1fr)_6.5rem] items-center gap-3.5">
              <span className="truncate text-sm font-semibold">{zone.name}</span>
              <span className="h-3 overflow-hidden rounded-full bg-card">
                <span className="block h-full rounded-full bg-deep" style={{ width: `${(zone.orders / max) * 100}%` }} />
              </span>
              <span className="text-right text-[0.8125rem] tabular-nums text-muted-ink">
                {zone.orders} cmd{zone.fee !== null ? ` · ${zone.fee === 0 ? 'gratuite' : `${num(zone.fee)} F`}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
