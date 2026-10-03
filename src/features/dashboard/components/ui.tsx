import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DASHBOARD_PERIODS, type DashboardPeriodKey } from '../period';

/** Carte claire du tableau de bord. */
export function Panel({
  id,
  title,
  aside,
  className,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn('flex min-w-0 flex-col gap-4 rounded-[32px] border border-border bg-surface p-6', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="font-display text-[1.375rem] leading-tight">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** État vide d'une carte : garde la hauteur pour que la grille reste équilibrée. */
export function PanelEmpty({
  icon,
  title,
  children,
  action,
  tone = 'light',
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl px-6 py-8 text-center',
        tone === 'light' ? 'border border-dashed border-border bg-card/50' : 'bg-cream/5',
        className,
      )}
    >
      <span
        className={cn(
          'relative grid size-14 place-items-center rounded-full [&_svg]:size-6',
          tone === 'light' ? 'bg-surface text-accent-ink shadow-[0_8px_24px_rgb(42_14_30/0.08)] ring-1 ring-border' : 'bg-cream/10 text-accent-soft',
        )}
      >
        <span aria-hidden="true" className={cn('absolute -inset-2 rounded-full border border-dashed', tone === 'light' ? 'border-border' : 'border-cream/15')} />
        {icon}
      </span>
      <p className={cn('font-display text-[1.125rem] leading-tight', tone === 'light' ? 'text-ink' : 'text-cream')}>{title}</p>
      {children && <p className={cn('max-w-xs text-[0.8125rem] leading-relaxed', tone === 'light' ? 'text-muted-ink' : 'text-deep-ink')}>{children}</p>}
      {action && (
        <Link
          href={action.href}
          className={cn(
            'mt-1 flex h-10 items-center rounded-full px-4 text-[0.8125rem] font-semibold transition-opacity hover:opacity-90',
            tone === 'light' ? 'bg-deep text-cream' : 'bg-cream text-deep',
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

const PERIOD_LABEL: Record<DashboardPeriodKey, string> = { '7j': '7 jours', mois: 'Mois', annee: 'Année' };

/** Choix de la période (dans l'URL : partageable, bouton Retour). */
export function PeriodSwitch({
  current,
  currentLabel,
  tone = 'light',
  labels,
  className,
}: {
  current: DashboardPeriodKey;
  currentLabel?: string;
  tone?: 'light' | 'dark';
  labels?: Partial<Record<DashboardPeriodKey, string>>;
  className?: string;
}) {
  return (
    <nav aria-label="Période" className={cn('flex gap-1 rounded-full p-1', tone === 'light' ? 'bg-surface ring-1 ring-inset ring-border' : 'bg-cream/8', className)}>
      {DASHBOARD_PERIODS.map((key) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={key === 'mois' ? '/admin' : `/admin?periode=${key}`}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-9 flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 text-[0.8125rem] transition-colors',
              tone === 'light'
                ? active
                  ? 'bg-deep font-semibold text-cream'
                  : 'text-muted-ink hover:bg-card hover:text-ink'
                : active
                  ? 'bg-cream font-semibold text-deep'
                  : 'text-cream/75 hover:text-cream',
            )}
          >
            {active && currentLabel ? currentLabel : (labels?.[key] ?? PERIOD_LABEL[key])}
          </Link>
        );
      })}
    </nav>
  );
}
