import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SearchX, UserRound, Users } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import Pagination from '@/components/admin/Pagination';
import {
  CUSTOMER_SEGMENTS,
  CUSTOMERS_PER_PAGE,
  DORMANT_DAYS,
  NEW_DAYS,
  customerListHref,
  listAdminCustomers,
  parseCustomerListParams,
  type CustomerSegment,
} from '@/features/customers/queries';
import CustomerSegments from '@/features/customers/components/CustomerSegments';
import CustomersToolbar from '@/features/customers/components/CustomersToolbar';
import CustomerList from '@/features/customers/components/CustomerList';

export const metadata: Metadata = {
  title: 'Clients · Administration',
  robots: { index: false, follow: false },
};

const EMPTY_SEGMENT: Record<CustomerSegment, { title: string; description: string }> = {
  tous: { title: 'Aucun client', description: 'Les clients apparaissent ici dès leur première commande.' },
  fideles: { title: 'Pas encore de client fidèle', description: 'Un client devient fidèle à sa deuxième commande.' },
  nouveaux: { title: 'Aucun nouveau client', description: `Aucun client arrivé ces ${NEW_DAYS} derniers jours.` },
  'a-relancer': {
    title: 'Personne à relancer',
    description: `Tous tes clients ont commandé ces ${DORMANT_DAYS} derniers jours. Ceux qui n’ont rien commandé depuis apparaîtront ici, pour un message WhatsApp.`,
  },
};

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseCustomerListParams(await searchParams);
  const { customers, total, segmentCounts, pageCount } = await listAdminCustomers(params);

  if (params.page > pageCount) redirect(customerListHref(params, { page: pageCount }));

  const noCustomersAtAll = !params.q && segmentCounts.tous === 0;
  const hrefs = Object.fromEntries(CUSTOMER_SEGMENTS.map((segment) => [segment, customerListHref(params, { segment, page: 1 })])) as Record<CustomerSegment, string>;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Clients</h1>
        <p className="text-sm text-muted-ink">
          {noCustomersAtAll ? (
            'Tes clients, reconnus par leur numéro de téléphone.'
          ) : (
            <>
              <span className="tabular-nums">{segmentCounts.tous}</span> client{segmentCounts.tous > 1 ? 's' : ''} ·{' '}
              <span className="tabular-nums">{segmentCounts.fideles}</span> fidèle{segmentCounts.fideles > 1 ? 's' : ''}
            </>
          )}
        </p>
      </header>

      {noCustomersAtAll ? (
        <ListEmptyState
          tone="welcome"
          icon={<Users strokeWidth={1.5} aria-hidden="true" />}
          title="Tes clients arriveront ici"
          description="Chaque commande crée ou complète la fiche du client : ses commandes, ce qu’il a dépensé, sa pointure habituelle et ses adresses de livraison."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            <CustomerSegments current={params.segment} counts={segmentCounts} hrefs={hrefs} />
            <CustomersToolbar initial={{ q: params.q, sort: params.sort }} />
          </div>

          {customers.length > 0 ? (
            <CustomerList customers={customers} />
          ) : params.q ? (
            <ListEmptyState
              icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
              title="Aucun client ne correspond"
              description={`Rien pour « ${params.q} »${params.segment !== 'tous' ? ' dans ce segment' : ''}. Essaie le nom, le numéro (77 123 45 67) ou l’e-mail.`}
              clearHref={customerListHref(params, { q: undefined, page: 1 })}
            />
          ) : (
            <ListEmptyState icon={<UserRound strokeWidth={1.5} aria-hidden="true" />} title={EMPTY_SEGMENT[params.segment].title} description={EMPTY_SEGMENT[params.segment].description} />
          )}

          <Pagination page={params.page} pageCount={pageCount} total={total} perPage={CUSTOMERS_PER_PAGE} buildHref={(page) => customerListHref(params, { page })} />
        </>
      )}
    </div>
  );
}
