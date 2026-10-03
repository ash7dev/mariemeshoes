import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Inbox, ReceiptText, SearchX } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import Pagination from '@/components/admin/Pagination';
import {
  ORDER_TABS,
  ORDERS_PER_PAGE,
  listAdminOrders,
  orderListHref,
  parseOrderListParams,
  type OrderTab,
} from '@/features/orders/queries';
import OrderTabs from '@/features/orders/components/OrderTabs';
import OrdersSearch from '@/features/orders/components/OrdersSearch';
import OrderList from '@/features/orders/components/OrderList';

export const metadata: Metadata = {
  title: 'Commandes · Administration',
  robots: { index: false, follow: false },
};

/** Onglet vide (sans recherche) : un message par onglet. */
const EMPTY_TAB: Record<OrderTab, { title: string; description: string }> = {
  'a-traiter': { title: 'Rien à traiter', description: 'Toutes les commandes sont livrées ou clôturées. Les nouvelles arriveront ici.' },
  'a-confirmer': { title: 'Aucune commande à confirmer', description: 'Chaque nouvelle commande apparaît ici jusqu’à ce que tu la confirmes.' },
  wave: { title: 'Aucun paiement Wave à vérifier', description: 'Les commandes payées par Wave apparaissent ici tant que tu n’as pas vérifié le paiement.' },
  'en-livraison': { title: 'Aucune commande en livraison', description: 'Les commandes expédiées apparaissent ici jusqu’à leur remise au client.' },
  livrees: { title: 'Aucune commande livrée', description: 'Les commandes remises aux clients s’afficheront ici.' },
  annulees: { title: 'Aucune annulation', description: 'Les commandes annulées ou retournées s’afficheront ici.' },
  toutes: { title: 'Aucune commande', description: 'Les commandes de la boutique s’afficheront ici.' },
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseOrderListParams(await searchParams);
  const { orders, total, tabCounts, pageCount } = await listAdminOrders(params);

  // Page au-delà de la dernière (après une recherche, ou des commandes traitées) : dernière page.
  if (params.page > pageCount) redirect(orderListHref(params, { page: pageCount }));

  const noOrdersAtAll = !params.q && tabCounts.toutes === 0;
  const hrefs = Object.fromEntries(ORDER_TABS.map((tab) => [tab, orderListHref(params, { tab, page: 1 })])) as Record<OrderTab, string>;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Commandes</h1>
        {noOrdersAtAll ? (
          <p className="text-sm text-muted-ink">Aucune commande pour l’instant.</p>
        ) : (
          <p className="text-sm text-muted-ink">
            <span className="tabular-nums">{tabCounts['a-traiter']}</span> en cours
            {tabCounts['a-confirmer'] > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-accent-ink">
                  {tabCounts['a-confirmer']} à confirmer
                </span>
              </>
            )}
            {tabCounts.wave > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-accent-ink">
                  {tabCounts.wave} paiement{tabCounts.wave > 1 ? 's' : ''} Wave à vérifier
                </span>
              </>
            )}
          </p>
        )}
      </header>

      {noOrdersAtAll ? (
        <ListEmptyState
          tone="welcome"
          icon={<ReceiptText strokeWidth={1.5} aria-hidden="true" />}
          title="Les commandes arriveront ici"
          description="Dès qu’un client commande, tu la retrouves ici : à confirmer, paiement Wave à vérifier, livraison, encaissement. Les paires sont réservées automatiquement."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            <OrderTabs current={params.tab} counts={tabCounts} hrefs={hrefs} />
            <OrdersSearch initial={params.q} />
          </div>

          {orders.length > 0 ? (
            <OrderList orders={orders} />
          ) : params.q ? (
            <ListEmptyState
              icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
              title="Aucune commande ne correspond"
              description={`Rien pour « ${params.q} »${params.tab !== 'toutes' ? ' dans cet onglet' : ''}. Essaie la référence (MS-…), le nom ou le numéro du client.`}
              clearHref={orderListHref(params, { q: undefined, page: 1 })}
            />
          ) : (
            <ListEmptyState icon={<Inbox strokeWidth={1.5} aria-hidden="true" />} title={EMPTY_TAB[params.tab].title} description={EMPTY_TAB[params.tab].description} />
          )}

          <Pagination page={params.page} pageCount={pageCount} total={total} perPage={ORDERS_PER_PAGE} buildHref={(page) => orderListHref(params, { page })} />
        </>
      )}
    </div>
  );
}
