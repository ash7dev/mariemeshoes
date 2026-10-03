import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, SearchX, Tag, Ticket } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import Pagination from '@/components/admin/Pagination';
import {
  PROMOTION_TABS,
  PROMOTIONS_PER_PAGE,
  listAdminPromotions,
  parsePromotionListParams,
  promotionListHref,
  type PromotionTab,
} from '@/features/promotions/list-queries';
import PromotionTabs from '@/features/promotions/components/list/PromotionTabs';
import PromotionsToolbar from '@/features/promotions/components/list/PromotionsToolbar';
import PromotionList from '@/features/promotions/components/list/PromotionList';

export const metadata: Metadata = {
  title: 'Promotions · Administration',
  robots: { index: false, follow: false },
};

const EMPTY_TAB: Record<PromotionTab, { title: string; description: string }> = {
  'en-cours': { title: 'Aucune promotion en cours', description: 'Rien n’est appliqué en ce moment. Les promotions programmées démarreront à leur date de début.' },
  programmees: { title: 'Rien de programmé', description: 'Prépare à l’avance une promotion (Tabaski, Korité, rentrée…) : elle démarrera toute seule.' },
  terminees: { title: 'Aucune promotion terminée', description: 'Les promotions arrivées à leur date de fin s’afficheront ici.' },
  desactivees: { title: 'Aucune promotion désactivée', description: 'Une promotion désactivée s’arrête tout de suite, sans perdre son historique.' },
  toutes: { title: 'Aucune promotion', description: 'Crée ta première promotion ou ton premier code promo.' },
};

const newButton = (label: string, className: string) => (
  <Link href="/admin/promotions/nouvelle" className={className}>
    <Plus className="size-[18px]" strokeWidth={2} aria-hidden="true" />
    {label}
  </Link>
);

export default async function AdminPromotionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = parsePromotionListParams(raw);
  const { promotions, total, tabCounts, pageCount } = await listAdminPromotions(params);

  if (params.page > pageCount) redirect(promotionListHref(params, { page: pageCount }));

  const hasFilters = Boolean(params.q || params.type !== 'tous');
  const nothingAtAll = !hasFilters && tabCounts.toutes === 0;
  const hrefs = Object.fromEntries(PROMOTION_TABS.map((tab) => [tab, promotionListHref(params, { tab, page: 1 })])) as Record<PromotionTab, string>;
  const deleted = raw.ok === 'supprimee';

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Promotions</h1>
          <p className="text-sm text-muted-ink">
            {nothingAtAll ? (
              'Codes promo et remises automatiques.'
            ) : (
              <>
                <span className="tabular-nums">{tabCounts['en-cours']}</span> en cours · <span className="tabular-nums">{tabCounts.programmees}</span>{' '}
                programmée{tabCounts.programmees > 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>
        {!nothingAtAll &&
          newButton('Nouvelle promotion', 'flex h-12 items-center gap-2 rounded-full bg-deep pl-4 pr-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90')}
      </header>

      {deleted && (
        <p role="status" className="rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink">
          Promotion supprimée.
        </p>
      )}

      {nothingAtAll ? (
        <ListEmptyState
          tone="welcome"
          icon={<Ticket strokeWidth={1.5} aria-hidden="true" />}
          title="Lance ta première promotion"
          description="Un code à partager sur Instagram (BIENVENUE, TABASKI10…), une remise automatique en prix barré, ou la livraison offerte dès un certain montant."
          action={newButton(
            'Créer une promotion',
            'flex h-12 items-center gap-2 rounded-full bg-accent pl-4 pr-5 text-sm font-semibold text-white transition-opacity hover:opacity-90',
          )}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            <PromotionTabs current={params.tab} counts={tabCounts} hrefs={hrefs} />
            <PromotionsToolbar initial={{ q: params.q, type: params.type }} />
          </div>

          {promotions.length > 0 ? (
            <PromotionList promotions={promotions} />
          ) : hasFilters ? (
            <ListEmptyState
              icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
              title="Aucune promotion ne correspond"
              description={params.q ? `Rien pour « ${params.q} » dans cet onglet.` : 'Aucune promotion de ce type dans cet onglet.'}
              clearHref={promotionListHref(params, { q: undefined, type: 'tous', page: 1 })}
            />
          ) : (
            <ListEmptyState icon={<Tag strokeWidth={1.5} aria-hidden="true" />} title={EMPTY_TAB[params.tab].title} description={EMPTY_TAB[params.tab].description} />
          )}

          <Pagination page={params.page} pageCount={pageCount} total={total} perPage={PROMOTIONS_PER_PAGE} buildHref={(page) => promotionListHref(params, { page })} />
        </>
      )}
    </div>
  );
}
