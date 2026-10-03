'use client';

import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { Toggle, inputClass } from '@/features/catalog/components/form-ui';
import { deleteZoneAction, moveZoneAction, saveZoneAction, setZoneActiveAction, type ActionResult } from '../actions';
import type { ZoneRow } from '../queries';
import { ResultMessage, SettingsCard } from './settings-ui';

/** Exemples de noms (aucun tarif imposé : c'est à la boutique de les fixer). */
const NAME_SUGGESTIONS = ['Dakar', 'Pikine / Guédiawaye', 'Rufisque', 'Thiès', 'Mbour / Saly', 'Autres régions'];

type Draft = { name: string; fee: string; estimatedDelay: string };
const EMPTY: Draft = { name: '', fee: '', estimatedDelay: '' };

/** Zones de livraison : le client choisit la sienne au panier ; ses frais s'ajoutent à la commande. */
export default function DeliveryZonesManager({ zones }: { zones: ZoneRow[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(zones.length === 0 ? 'new' : null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionResult>, after?: () => void) =>
    startTransition(async () => {
      const outcome = await fn();
      setResult(outcome);
      if (outcome.ok) after?.();
    });

  const startEdit = (zone: ZoneRow) => {
    setEditing(zone.id);
    setResult(null);
    setDraft({ name: zone.name, fee: String(zone.fee), estimatedDelay: zone.estimatedDelay ?? '' });
  };

  const editor = (zoneId: string | null) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(() => saveZoneAction(zoneId, draft), () => {
          setEditing(null);
          setDraft(EMPTY);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Zone
          <input value={draft.name} required maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Dakar" className={cn(inputClass, 'h-11 border-border')} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Frais (FCFA)
          <input
            value={draft.fee}
            required
            inputMode="numeric"
            onChange={(e) => setDraft({ ...draft, fee: e.target.value.replace(/[^\d\s]/g, '') })}
            placeholder="0 = gratuite"
            className={cn(inputClass, 'h-11 border-border tabular-nums')}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span>
            Délai <span className="font-normal text-muted-ink">(facultatif)</span>
          </span>
          <input value={draft.estimatedDelay} maxLength={40} onChange={(e) => setDraft({ ...draft, estimatedDelay: e.target.value })} placeholder="24 h" className={cn(inputClass, 'h-11 border-border')} />
        </label>
      </div>
      {zoneId === null && (
        <div className="flex flex-wrap gap-1.5">
          {NAME_SUGGESTIONS.filter((name) => !zones.some((z) => z.name.toLowerCase() === name.toLowerCase())).map((name) => (
            <button key={name} type="button" onClick={() => setDraft({ ...draft, name })} className="h-8 rounded-full bg-surface px-3 text-xs hover:bg-border">
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        {(zones.length > 0 || zoneId) && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDraft(EMPTY);
            }}
            className="h-10 rounded-full px-4 text-sm text-muted-ink hover:text-ink"
          >
            Annuler
          </button>
        )}
        <button type="submit" disabled={pending} className="flex h-10 items-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-cream disabled:opacity-70">
          {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          {zoneId ? 'Enregistrer' : 'Ajouter la zone'}
        </button>
      </div>
    </form>
  );

  const activeCount = zones.filter((z) => z.isActive).length;

  return (
    <SettingsCard
      id="livraison"
      title="Livraison"
      description="Le client choisit sa zone au panier ; ses frais s’ajoutent à la commande. Une zone masquée n’est plus proposée."
    >
      {result && <ResultMessage ok={result.ok}>{result.ok ? result.message : result.error}</ResultMessage>}

      {zones.length > 0 && activeCount === 0 && (
        <ResultMessage ok={false}>Aucune zone n’est proposée : les clients ne peuvent pas commander. Active au moins une zone.</ResultMessage>
      )}

      {zones.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-ink">
          <Truck className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
          Aucune zone pour l’instant : ajoute au moins une zone pour que les clients puissent commander.
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {zones.map((zone, index) =>
            editing === zone.id ? (
              <li key={zone.id} className="p-2">
                {editor(zone.id)}
              </li>
            ) : (
              <li key={zone.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !zone.isActive && 'bg-page')}>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn('font-medium', !zone.isActive && 'text-muted-ink')}>{zone.name}</span>
                  <span className="text-[0.8125rem] text-muted-ink">
                    {zone.fee === 0 ? 'Gratuite' : formatFCFA(zone.fee)}
                    {zone.estimatedDelay ? ` · ${zone.estimatedDelay}` : ''}
                    {zone.orders > 0 ? ` · ${zone.orders} commande${zone.orders > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
                <Toggle checked={zone.isActive} onChange={(isActive) => run(() => setZoneActiveAction(zone.id, isActive))} label={zone.isActive ? 'Proposée' : 'Masquée'} />
                <div className="flex items-center gap-1">
                  <IconButton label="Monter" disabled={index === 0 || pending} onClick={() => run(() => moveZoneAction(zone.id, -1))}>
                    <ArrowUp className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Descendre" disabled={index === zones.length - 1 || pending} onClick={() => run(() => moveZoneAction(zone.id, 1))}>
                    <ArrowDown className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Modifier ${zone.name}`} onClick={() => startEdit(zone)}>
                    <Pencil className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  </IconButton>
                  {zone.orders === 0 && (
                    <IconButton
                      label={`Supprimer ${zone.name}`}
                      disabled={pending}
                      className="text-accent-ink hover:bg-[#FBE3EE]"
                      onClick={() => window.confirm(`Supprimer la zone « ${zone.name} » ?`) && run(() => deleteZoneAction(zone.id))}
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {editing === 'new' ? (
        editor(null)
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing('new');
            setDraft(EMPTY);
            setResult(null);
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-muted text-sm font-semibold transition-colors hover:border-accent hover:text-accent-ink"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
          Ajouter une zone
        </button>
      )}
    </SettingsCard>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn('grid size-9 place-items-center rounded-xl text-muted-ink transition-colors hover:bg-card hover:text-ink disabled:pointer-events-none disabled:opacity-30', className)}
    >
      {children}
    </button>
  );
}
