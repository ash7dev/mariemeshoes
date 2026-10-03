import Link from 'next/link';
import { Check, ChevronRight, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Carte d'une section des paramètres, avec ancre pour la navigation (#boutique…). */
export function SettingsCard({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-28 flex-col gap-5 rounded-[28px] border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-col gap-1.5">
        <h2 id={`${id}-title`} className="font-display text-[1.5rem] leading-tight">
          {title}
        </h2>
        {description && <p className="text-sm leading-relaxed text-muted-ink">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Message après une action (succès / erreur). */
export function ResultMessage({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p role={ok ? 'status' : 'alert'} className={cn('rounded-2xl px-4 py-3 text-sm', ok ? 'bg-[#E3F1E6] text-[#1F6B3A]' : 'bg-[#FBE3EE] text-accent-ink')}>
      {children}
    </p>
  );
}

export type ReadinessItem = { key: string; label: string; done: boolean; required: boolean; href: string; hint: string };

/** « La boutique est-elle prête à vendre ? » : ce qui manque, avec un lien vers la section. */
export function ReadinessPanel({ items }: { items: ReadinessItem[] }) {
  const missingRequired = items.filter((item) => item.required && !item.done);
  const allDone = items.every((item) => item.done);
  if (allDone) {
    return (
      <p className="flex items-center gap-3 rounded-[24px] bg-[#E3F1E6] px-5 py-4 text-sm font-medium text-[#1F6B3A]">
        <Check className="size-5" strokeWidth={2.2} aria-hidden="true" />
        Tout est en place : la boutique peut recevoir des commandes.
      </p>
    );
  }
  return (
    <section aria-labelledby="readiness-title" className={cn('flex flex-col gap-4 rounded-[28px] p-5 sm:p-6', missingRequired.length ? 'bg-deep text-cream' : 'border border-border bg-surface')}>
      <div className="flex flex-col gap-1">
        <h2 id="readiness-title" className="font-display text-[1.375rem]">
          {missingRequired.length ? 'Avant de vendre' : 'Presque prêt'}
        </h2>
        <p className={cn('text-sm', missingRequired.length ? 'text-deep-ink' : 'text-muted-ink')}>
          {missingRequired.length
            ? `${missingRequired.length} réglage${missingRequired.length > 1 ? 's' : ''} indispensable${missingRequired.length > 1 ? 's' : ''} manque${missingRequired.length > 1 ? 'nt' : ''} pour que les clients puissent commander.`
            : 'Les réglages indispensables sont faits ; quelques compléments sont conseillés.'}
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                'flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors',
                missingRequired.length ? 'bg-cream/[0.07] hover:bg-cream/[0.12]' : 'bg-card hover:bg-border',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                  item.done ? 'bg-[#1F6B3A] text-white' : item.required ? 'bg-accent text-white' : 'border border-current opacity-60',
                )}
              >
                {item.done ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : item.required ? <CircleAlert className="size-3" strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {item.label}
                  {!item.required && <span className="font-normal opacity-70"> · conseillé</span>}
                </span>
                {!item.done && <span className="text-xs opacity-75">{item.hint}</span>}
              </span>
              {!item.done && <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-60" strokeWidth={1.8} aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const NAV = [
  { id: 'boutique', label: 'Boutique' },
  { id: 'wave', label: 'Paiement Wave' },
  { id: 'livraison', label: 'Livraison' },
  { id: 'catalogue', label: 'Marques et catégories' },
] as const;

/** Sommaire des sections (ordinateur : colonne collante ; mobile : rangée défilante). */
export function SettingsNav({ warnings }: { warnings: Partial<Record<(typeof NAV)[number]['id'], boolean>> }) {
  return (
    <nav aria-label="Sections des paramètres" className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-28 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-card p-1 lg:w-auto lg:flex-col lg:rounded-[24px] lg:p-2">
        {NAV.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium text-muted-ink transition-colors hover:bg-surface hover:text-ink lg:rounded-2xl">
              {item.label}
              {warnings[item.id] && <span className="size-2 rounded-full bg-accent" aria-label="à compléter" />}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
