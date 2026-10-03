import Link from 'next/link';
import { MessageCircle, PackageOpen, SearchX, Smartphone, Sparkles } from 'lucide-react';
import { whatsappLink, WHATSAPP_DEFAULT_MESSAGE } from '@/lib/whatsapp';
import ClearSizeButton from './ClearSizeButton';

/** La boutique n'a encore aucune paire en ligne. */
export function CatalogEmpty({ whatsapp }: { whatsapp: string | null }) {
  const href = whatsappLink(whatsapp, WHATSAPP_DEFAULT_MESSAGE);
  return (
    <section className="mx-4 mt-6 flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-16 text-center lg:mx-0 lg:mt-10 lg:py-24">
      <span className="grid size-16 place-items-center rounded-full bg-surface text-accent-ink">
        <PackageOpen className="size-7" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="font-display text-[1.75rem] leading-tight lg:text-[2.25rem]">Les premières paires arrivent</h2>
      <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-ink">
        La boutique se remplit en ce moment. Tu cherches un modèle précis ? Demande-nous, on te dit s&apos;il arrive bientôt.
      </p>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 flex h-[52px] items-center gap-2.5 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-white">
          <MessageCircle className="size-[19px]" strokeWidth={1.7} aria-hidden="true" />
          Écrire sur WhatsApp
        </a>
      )}
    </section>
  );
}

/** Les filtres (ou la pointure) ne laissent aucune paire. */
export function NoResults({ size, clearHref, hasFilters }: { size: number | null; clearHref: string; hasFilters: boolean }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-14 text-center lg:py-20">
      <span className="grid size-16 place-items-center rounded-full bg-surface text-accent-ink">
        <SearchX className="size-7" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="font-display text-[1.625rem] leading-tight lg:text-[2rem]">
        {size ? `Rien en ${size} pour cette sélection` : 'Aucune paire pour cette sélection'}
      </h2>
      <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-ink">
        {hasFilters ? 'Retire un filtre pour voir plus de modèles.' : 'Essaie une autre pointure : de nouvelles paires arrivent régulièrement.'}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        {hasFilters && (
          <Link href={clearHref} className="flex h-12 items-center rounded-full bg-deep px-6 text-sm font-semibold text-cream">
            Effacer les filtres
          </Link>
        )}
        {size !== null && <ClearSizeButton />}
      </div>
    </section>
  );
}

const REASSURANCE = [
  { icon: Sparkles, title: 'Paires 100 % neuves', text: 'Dans leur boîte d’origine.' },
  { icon: Smartphone, title: 'Wave ou à la livraison', text: 'Tu choisis au moment de commander.' },
  { icon: MessageCircle, title: 'Un doute sur ta pointure ?', text: 'On te répond sur WhatsApp.' },
] as const;

/** Trois garanties sous la grille (ordinateur). */
export function Reassurance({ whatsapp }: { whatsapp: string | null }) {
  const href = whatsappLink(whatsapp, WHATSAPP_DEFAULT_MESSAGE);
  return (
    <section aria-label="Nos engagements" className="mt-14 hidden grid-cols-3 gap-4 lg:grid">
      {REASSURANCE.map(({ icon: Icon, title, text }, index) => {
        const content = (
          <>
            <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-surface text-accent-ink">
              <Icon className="size-[22px]" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <strong className="text-[0.9375rem] font-semibold">{title}</strong>
              <span className="text-[0.8125rem] text-muted-ink">{text}</span>
            </span>
          </>
        );
        const className = 'flex items-center gap-[18px] rounded-[28px] bg-card px-[26px] py-6';
        return index === 2 && href ? (
          <a key={title} href={href} target="_blank" rel="noopener noreferrer" className={`${className} transition-colors hover:bg-border`}>
            {content}
          </a>
        ) : (
          <div key={title} className={className}>
            {content}
          </div>
        );
      })}
    </section>
  );
}
