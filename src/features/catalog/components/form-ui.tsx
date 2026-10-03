'use client';

import { cn } from '@/lib/utils';

/** Primitives visuelles du formulaire produit (admin). */

export const inputClass =
  'w-full rounded-2xl border bg-surface px-4 text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted hover:border-muted focus:border-accent focus:shadow-[0_0_0_4px_rgb(230_0_126/0.12)] disabled:opacity-60';

export function inputState(error?: string) {
  return error ? 'border-accent-ink' : 'border-border';
}

export function Section({
  id,
  title,
  description,
  children,
  aside,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5 rounded-[28px] border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id={`${id}-title`} className="font-display text-[1.375rem] leading-tight">
            {title}
          </h2>
          {description && <p className="text-sm leading-relaxed text-muted-ink">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted-ink">(facultatif)</span>}
      </label>
      {children}
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-sm text-accent-ink">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-[0.8125rem] leading-relaxed text-muted-ink">
        {hint}
      </p>
    );
  }
  return null;
}

/** aria-* d'un champ : invalide + description (erreur, sinon aide). */
export function describe(id: string, error?: string, hint?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

/** Pastille sélectionnable (choix unique). */
export function ChoiceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex h-11 items-center gap-2 rounded-full px-5 text-sm transition-colors duration-150',
        selected ? 'bg-deep font-medium text-cream' : 'border border-border bg-page text-ink hover:border-muted',
      )}
    >
      {children}
    </button>
  );
}

/** Interrupteur accessible (en vente / masqué). */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-border')}>
        <span
          className={cn(
            'absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted-ink">{description}</span>}
      </span>
    </button>
  );
}
