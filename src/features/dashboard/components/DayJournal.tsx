'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalEvent } from '../queries';
import { Panel, PanelEmpty } from './ui';

const FILTERS = [
  { key: 'tout', label: 'Tout' },
  { key: 'commandes', label: 'Commandes' },
  { key: 'paiements', label: 'Paiements' },
  { key: 'stock', label: 'Stock' },
] as const;

const DOT: Record<JournalEvent['tone'], string> = {
  new: 'bg-accent',
  ok: 'bg-[#1F6B3A]',
  alert: 'bg-accent-ink',
  neutral: 'bg-deep',
  promo: 'bg-accent-soft',
};

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });

/** Journal du jour : commandes, changements de statut, paiements, mouvements de stock. */
export default function DayJournal({ events, className }: { events: JournalEvent[]; className?: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('tout');
  const shown = filter === 'tout' ? events : events.filter((e) => e.kind === filter);

  return (
    <Panel
      id="journal"
      title="Journal du jour"
      className={className}
      aside={
        <span className="flex items-center gap-1.5 text-xs text-[#1F6B3A]">
          <span className="size-[7px] rounded-full bg-[#1F6B3A]" />
          aujourd’hui
        </span>
      }
    >
      {events.length === 0 ? (
        <PanelEmpty icon={<Sparkles strokeWidth={1.5} aria-hidden="true" />} title="Journée calme pour l’instant">
          Nouvelles commandes, paiements Wave, livraisons et réassorts du jour s’afficheront ici, heure par heure.
        </PanelEmpty>
      ) : (
        <>
          <div role="radiogroup" aria-label="Filtrer le journal" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn('h-8 rounded-full border px-3 text-[0.8125rem] font-semibold transition-colors', filter === f.key ? 'border-deep bg-deep text-cream' : 'border-border text-muted-ink hover:text-ink')}
              >
                {f.label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-ink">Rien dans cette catégorie aujourd’hui.</p>
          ) : (
            <ol className="flex flex-col">
              {shown.map((event, index) => (
                <li key={event.key} className="grid grid-cols-[2.75rem_0.875rem_minmax(0,1fr)] gap-2.5 pb-4 last:pb-0">
                  <span suppressHydrationWarning className="pt-px text-xs font-semibold tabular-nums text-muted-ink">
                    {time.format(new Date(event.at))}
                  </span>
                  <span className="flex flex-col items-center">
                    <span className={cn('mt-[3px] size-3 rounded-full', DOT[event.tone])} />
                    {index < shown.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                  </span>
                  {event.href ? (
                    <Link href={event.href} className="flex flex-col gap-0.5 hover:text-accent-ink">
                      <strong className="text-sm">{event.title}</strong>
                      <span className="text-[0.8125rem] text-muted-ink">{event.detail}</span>
                    </Link>
                  ) : (
                    <span className="flex flex-col gap-0.5">
                      <strong className="text-sm">{event.title}</strong>
                      <span className="text-[0.8125rem] text-muted-ink">{event.detail}</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Panel>
  );
}
