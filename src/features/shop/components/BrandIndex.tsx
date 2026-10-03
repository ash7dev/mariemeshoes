'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, MessageCircle, Search, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { useSizePicker } from '@/features/size/SizeProvider';
import type { BrandIndexEntry } from '../queries';
import ProductCard from './ProductCard';
import ProductCardMobile from './ProductCardMobile';

type Sort = 'az' | 'ventes';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Première lettre sans accent (« É » → « E »), « # » pour un chiffre. */
function initialOf(name: string): string {
  const c = name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * L'Index des marques : chaque marque en très grand, ses chiffres (modèles, prix d'entrée,
 * disponibles dans la pointure du client) et, dépliée, ses paires du moment.
 * Recherche, tri et « dispo dans ma pointure » se font sur place.
 */
export default function BrandIndex({
  brands,
  size,
  whatsappHref,
  intro,
}: {
  brands: BrandIndexEntry[];
  size: number | null;
  whatsappHref: string | null;
  /** En-tête de page (titre), à gauche des commandes sur ordinateur. */
  intro: React.ReactNode;
}) {
  const { openPicker } = useSizePicker();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('az');
  const [onlyFit, setOnlyFit] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    const list = brands.filter(
      (b) =>
        (!q || normalize(b.name).includes(q) || b.highlights.some((h) => normalize(h).includes(q))) &&
        (size === null || !onlyFit || (b.inSize ?? 0) > 0),
    );
    return sort === 'ventes' ? [...list].sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name, 'fr')) : list;
  }, [brands, query, sort, onlyFit, size]);

  // Ancre de la première marque de chaque lettre (tri A → Z uniquement).
  const firstOfLetter = new Map<string, string>();
  if (sort === 'az') for (const b of shown) if (!firstOfLetter.has(initialOf(b.name))) firstOfLetter.set(initialOf(b.name), b.slug);
  const hiddenBySize = size !== null && onlyFit ? brands.filter((b) => !b.inSize).length : 0;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-[60px]">
      {intro}
      {/* Commandes */}
      <div className="flex flex-col gap-2.5 px-4 lg:px-0">
        <label className="relative flex h-[46px] items-center rounded-full border border-border bg-surface lg:h-14">
          <span className="sr-only">Chercher une marque</span>
          <Search className="pointer-events-none absolute left-4 size-[18px] text-muted-ink lg:left-5" strokeWidth={1.8} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Chercher une marque ou un modèle"
            className="h-full w-full rounded-full bg-transparent pl-11 pr-4 text-[0.9375rem] outline-none placeholder:text-muted-ink lg:pl-12"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {size !== null ? (
            <button
              type="button"
              aria-pressed={onlyFit}
              onClick={() => setOnlyFit((v) => !v)}
              className={cn(
                'flex h-[42px] items-center gap-2 rounded-full px-4 text-[0.8125rem] font-semibold transition-colors lg:h-12 lg:flex-1 lg:justify-center',
                onlyFit ? 'bg-accent text-white' : 'border border-border bg-surface text-ink',
              )}
            >
              {onlyFit && <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />}
              Dispo en {size}
            </button>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              className="flex h-[42px] items-center gap-2 rounded-full bg-accent px-4 text-[0.8125rem] font-semibold text-white lg:h-12 lg:flex-1 lg:justify-center"
            >
              Choisir ma pointure
            </button>
          )}
          <div role="group" aria-label="Trier" className="flex gap-0.5 rounded-full bg-card p-1">
            {(
              [
                ['az', 'A → Z'],
                ['ventes', 'Les plus vendues'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
                className={cn(
                  'h-[34px] rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors lg:h-10 lg:px-4',
                  sort === key ? 'bg-deep text-cream' : 'text-muted-ink hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      </div>

      {/* Lettres (ordinateur) */}
      {sort === 'az' && (
        <nav aria-label="Aller à la lettre" className="mt-10 hidden justify-between border-y border-b-border border-t-ink px-1 py-3.5 lg:flex">
          {LETTERS.map((letter) => {
            const target = firstOfLetter.get(letter);
            return target ? (
              <a key={letter} href={`#marque-${target}`} className="w-[30px] text-center font-display text-lg hover:text-accent-ink">
                {letter}
              </a>
            ) : (
              <span key={letter} aria-hidden="true" className="w-[30px] text-center font-display text-lg text-border">
                {letter}
              </span>
            );
          })}
        </nav>
      )}

      {/* L'index */}
      {shown.length === 0 ? (
        <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-[28px] bg-card px-6 py-12 text-center lg:mx-0">
          <SearchX className="size-7 text-accent-ink" strokeWidth={1.5} aria-hidden="true" />
          <p className="font-display text-[1.5rem]">{query ? `Aucune marque pour « ${query} »` : `Aucune marque en ${size} pour l’instant`}</p>
          {size !== null && onlyFit && (
            <button type="button" onClick={() => setOnlyFit(false)} className="h-11 rounded-full bg-deep px-5 text-sm font-semibold text-cream">
              Voir toutes les pointures
            </button>
          )}
        </div>
      ) : (
        <ol className={cn('mt-[18px] px-4 lg:px-0', sort !== 'az' && 'lg:mt-10 lg:border-t lg:border-ink')}>
          {shown.map((brand, index) => {
            const isOpen = open === brand.slug;
            const panelId = `marque-panel-${brand.slug}`;
            return (
              <li key={brand.slug} id={`marque-${brand.slug}`} className="scroll-mt-28 border-t border-border first:border-t-0 lg:border-b lg:border-t-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : brand.slug)}
                  className="flex w-full items-center gap-3 py-4 text-left lg:grid lg:grid-cols-[56px_minmax(0,1fr)_250px_270px_56px] lg:gap-6 lg:px-2 lg:py-[26px]"
                >
                  <span className="w-[22px] shrink-0 text-[0.6875rem] font-semibold tabular-nums text-muted lg:w-auto lg:text-[0.8125rem]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span
                      className={cn(
                        'truncate font-display text-[2.125rem] leading-none tracking-[-0.01em] transition-colors lg:text-[5.25rem] lg:leading-[0.95]',
                        isOpen ? 'text-accent-ink' : 'text-ink',
                      )}
                    >
                      {brand.name}
                    </span>
                    <span className="text-xs text-muted-ink lg:hidden">
                      {brand.models} modèle{brand.models > 1 ? 's' : ''}
                      {brand.inSize !== null && (
                        <>
                          {' · '}
                          <strong className="text-accent-ink">
                            {brand.inSize} en {size}
                          </strong>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="hidden text-sm leading-normal text-muted-ink lg:block">{brand.highlights.join(' · ')}</span>
                  <span className="hidden flex-col items-start gap-2 lg:flex">
                    <span className="text-sm">
                      <strong>
                        {brand.models} modèle{brand.models > 1 ? 's' : ''}
                      </strong>{' '}
                      <span className="text-muted-ink">· dès {formatFCFA(brand.fromPrice)}</span>
                    </span>
                    {brand.inSize !== null && (
                      <span className="flex h-7 items-center gap-1.5 rounded-full bg-section px-3 text-[0.78125rem] font-bold text-section-ink">
                        <span aria-hidden="true" className="size-[7px] rounded-full bg-accent" />
                        {brand.inSize} dispo en {size}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-200 lg:size-14',
                      isOpen ? 'rotate-180 bg-deep text-cream lg:rotate-90' : 'bg-card',
                    )}
                  >
                    <ChevronDown className="size-4 lg:hidden" strokeWidth={2} aria-hidden="true" />
                    <ArrowRight className="hidden size-5 lg:block" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={panelId}
                    className="-mx-4 mb-4 flex flex-col gap-3 bg-section px-4 py-4 lg:mx-0 lg:mb-7 lg:grid lg:grid-cols-[repeat(4,minmax(0,1fr))_230px] lg:gap-4 lg:rounded-[36px] lg:p-[26px]"
                  >
                    {/* Mobile : les grandes cartes de la boutique, l'une sous l'autre. */}
                    <ul className="flex flex-col gap-3 lg:hidden">
                      {brand.preview.map((card) => (
                        <li key={card.id}>
                          <ProductCardMobile card={card} size={size} />
                        </li>
                      ))}
                    </ul>
                    {/* Ordinateur : la carte de la boutique en version compacte, sur une rangée. */}
                    <ul className="hidden lg:contents">
                      {brand.preview.map((card) => (
                        <li key={card.id}>
                          <ProductCard card={card} size={size} compact />
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/boutique?marque=${brand.slug}`}
                      className="flex h-12 items-center justify-center gap-2 rounded-full bg-deep text-sm font-semibold text-cream lg:h-auto lg:flex-col lg:items-start lg:justify-between lg:rounded-[24px] lg:p-6"
                    >
                      <span className="lg:font-display lg:text-[1.875rem] lg:font-normal lg:leading-[1.05]">
                        <span className="lg:hidden">Voir les {brand.models} modèles {brand.name}</span>
                        <span className="hidden lg:inline">Tout {brand.name}</span>
                      </span>
                      <span className="flex flex-col gap-3.5">
                        <span className="hidden text-[0.84375rem] font-normal text-deep-ink lg:block">
                          {brand.models} modèle{brand.models > 1 ? 's' : ''}
                          {brand.inSize !== null && ` · ${brand.inSize} dans ta pointure`}
                        </span>
                        <span className="grid place-items-center lg:size-[52px] lg:rounded-full lg:bg-accent">
                          <ArrowRight className="size-4 lg:size-5" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {hiddenBySize > 0 && shown.length > 0 && (
        <p className="mt-5 px-4 text-sm text-muted-ink lg:px-0">
          {hiddenBySize} marque{hiddenBySize > 1 ? 's' : ''} sans paire en {size} pour l’instant.{' '}
          <button type="button" onClick={() => setOnlyFit(false)} className="font-semibold text-accent-ink underline underline-offset-[3px]">
            Les afficher
          </button>
        </p>
      )}

      {/* Marque absente */}
      <section className="mx-4 mt-10 flex flex-col gap-4 rounded-[28px] bg-card p-6 lg:mx-0 lg:mt-16 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:rounded-[36px] lg:px-10 lg:py-[34px]">
        <div className="flex flex-col gap-2">
          <p className="font-display text-[1.625rem] leading-[1.1] lg:text-[2rem]">Ta marque n’est pas dans la liste ?</p>
          <p className="text-[0.9375rem] text-muted-ink">Dis-nous le modèle et ta pointure : on te dit s’il peut arriver.</p>
        </div>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[54px] shrink-0 items-center justify-center gap-2.5 rounded-full bg-deep px-[26px] text-[0.9375rem] font-semibold text-cream"
          >
            <MessageCircle className="size-[19px]" strokeWidth={1.7} aria-hidden="true" />
            Demander sur WhatsApp
          </a>
        )}
      </section>
    </div>
  );
}
