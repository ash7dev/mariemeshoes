'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adjustVariantStockAction } from '../../actions';

type Mode = 'restock' | 'correction';

const CORRECTION_REASONS = ['Inventaire', 'Paire abîmée', 'Paire offerte', 'Autre'];

/**
 * Ajustement de stock d'une pointure :
 *  - Réassort : on ajoute les paires reçues (note facultative) ;
 *  - Correction : on corrige un écart, en plus ou en moins, avec un motif obligatoire.
 * Chaque validation crée un mouvement tracé (qui, quand, pourquoi).
 */
export default function StockAdjuster({
  variantId,
  label,
  currentStock,
  onDone,
  onCancel,
}: {
  variantId: string;
  label: string;
  currentStock: number;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>('restock');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const delta = mode === 'restock' ? Math.abs(quantity) : quantity;
  const next = currentStock + delta;
  const correctionNote = [reason, note.trim()].filter(Boolean).join(' — ');
  const invalid = !Number.isInteger(quantity) || delta === 0 || next < 0 || (mode === 'correction' && !correctionNote);

  const switchMode = (value: Mode) => {
    setMode(value);
    setError(null);
    if (value === 'restock') setQuantity((q) => Math.max(1, Math.abs(q)));
  };

  const submit = () => {
    if (invalid) return;
    setError(null);
    startTransition(async () => {
      const result = await adjustVariantStockAction(
        variantId,
        mode === 'restock' ? { mode, quantity: delta, note: note.trim() } : { mode, delta, note: correctionNote },
      );
      if (result.ok) onDone(`${label} : stock ${currentStock} → ${result.stock}`);
      else setError(result.error);
    });
  };

  const id = `adjust-${variantId}`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div role="radiogroup" aria-label="Type d’ajustement" className="flex w-fit gap-1 rounded-full bg-card p-1">
        {(
          [
            ['restock', 'Réassort'],
            ['correction', 'Correction'],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => switchMode(value)}
            className={cn('h-9 rounded-full px-4 text-sm font-semibold transition-colors', mode === value ? 'bg-deep text-cream' : 'text-muted-ink hover:text-ink')}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-qty`} className="text-[0.8125rem] font-semibold">
            {mode === 'restock' ? 'Paires reçues' : 'Écart (+ ou −)'}
          </label>
          <div className="flex items-center rounded-full border border-border bg-page p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => (mode === 'restock' ? Math.max(1, q - 1) : q - 1))}
              aria-label="Diminuer"
              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-card"
            >
              <Minus className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <input
              id={`${id}-qty`}
              inputMode="numeric"
              value={mode === 'correction' && quantity > 0 ? `+${quantity}` : String(quantity)}
              onChange={(event) => {
                const raw = event.target.value.replace(/[^\d-]/g, '');
                const parsed = raw === '' || raw === '-' ? 0 : Number.parseInt(raw, 10);
                setQuantity(Number.isNaN(parsed) ? 0 : mode === 'restock' ? Math.abs(parsed) : parsed);
              }}
              className="h-10 w-16 bg-transparent text-center text-base font-semibold tabular-nums outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Augmenter"
              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-card"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="flex h-12 items-center gap-2 text-sm text-muted-ink" aria-live="polite">
          Stock : <span className="tabular-nums">{currentStock}</span> →
          <span className={cn('text-base font-bold tabular-nums', next < 0 ? 'text-accent-ink' : 'text-ink')}>{next}</span>
        </p>
      </div>

      {mode === 'correction' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[0.8125rem] font-semibold">Motif</legend>
          <div className="flex flex-wrap gap-2">
            {CORRECTION_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(reason === r ? '' : r)}
                className={cn('h-9 rounded-full px-3.5 text-[0.8125rem] transition-colors', reason === r ? 'bg-deep text-cream' : 'border border-border hover:border-ink')}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-note`} className="text-[0.8125rem] font-semibold">
          {mode === 'restock' ? 'Note' : 'Précision'} <span className="font-normal text-muted-ink">(facultatif)</span>
        </label>
        <input
          id={`${id}-note`}
          value={note}
          maxLength={150}
          onChange={(event) => setNote(event.target.value)}
          placeholder={mode === 'restock' ? 'Ex. Arrivage de Dubaï' : 'Ex. Semelle abîmée'}
          className="h-11 rounded-xl border border-border bg-page px-3.5 text-sm outline-none placeholder:text-muted focus:border-ink"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-accent-ink">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={invalid || pending}
          className="flex h-11 items-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Valider
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-full px-4 text-sm text-muted-ink hover:text-ink">
          Annuler
        </button>
      </div>
    </div>
  );
}
