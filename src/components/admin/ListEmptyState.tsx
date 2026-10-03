import Link from 'next/link';
import { cn } from '@/lib/utils';

type ListEmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  /**
   * welcome : premier usage (liste vraiment vide), mise en avant avec une action.
   * neutral : filtre ou onglet sans résultat.
   */
  tone?: 'welcome' | 'neutral';
  action?: React.ReactNode;
  /** Lien « Effacer les filtres » (recherche sans résultat). */
  clearHref?: string;
};

/** État vide des listes admin (produits, commandes, clients…). */
export default function ListEmptyState({ icon, title, description, tone = 'neutral', action, clearHref }: ListEmptyStateProps) {
  const welcome = tone === 'welcome';
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-5 rounded-[28px] px-6 py-14 text-center',
        welcome ? 'bg-deep text-cream lg:py-20' : 'border border-dashed border-border bg-surface',
      )}
    >
      <span
        className={cn(
          'grid size-16 place-items-center rounded-full [&>svg]:size-7',
          welcome ? 'bg-cream/10 text-accent-soft' : 'bg-card text-muted-ink',
        )}
      >
        {icon}
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className={cn('font-display', welcome ? 'text-[1.75rem] leading-tight lg:text-[2.125rem]' : 'text-[1.375rem]')}>{title}</h2>
        <p className={cn('text-[0.9375rem] leading-relaxed', welcome ? 'text-deep-ink' : 'text-muted-ink')}>{description}</p>
      </div>
      {action}
      {clearHref && (
        <Link href={clearHref} className="text-sm font-semibold text-accent-ink underline underline-offset-4 hover:text-ink">
          Effacer les filtres
        </Link>
      )}
    </div>
  );
}
