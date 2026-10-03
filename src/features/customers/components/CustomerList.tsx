import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatRelative } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { ContactButtons } from '@/features/orders/components/order-ui';
import { LOYAL_MIN_ORDERS, type AdminCustomerRow } from '../queries';

/** Liste des clients. Ordinateur : lignes en colonnes. Mobile : cartes. */
export default function CustomerList({ customers }: { customers: AdminCustomerRow[] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-6 border-b border-border px-6 py-3 text-[0.71875rem] font-semibold uppercase tracking-[0.16em] text-muted-ink lg:grid"
      >
        <span>Client</span>
        <span>Pointure</span>
        <span>Commandes</span>
        <span>Dépensé</span>
        <span>Dernière</span>
        <span className="w-[6.25rem]" />
      </div>

      <ul className="divide-y divide-border">
        {customers.map((customer) => {
          const loyal = customer.orders >= LOYAL_MIN_ORDERS;
          return (
            <li
              key={customer.id}
              className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 p-4 transition-colors hover:bg-page lg:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-6"
            >
              {/* Client */}
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className={cn('grid size-11 shrink-0 place-items-center rounded-full font-display text-lg', loyal ? 'bg-deep text-cream' : 'bg-section text-section-ink')}>
                  {customer.fullName.charAt(0).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/clients/${customer.id}`} className="truncate font-semibold after:absolute after:inset-0 after:content-[''] hover:text-accent-ink">
                      {customer.fullName}
                    </Link>
                    {loyal && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">Fidèle</span>}
                  </div>
                  <span className="text-[0.8125rem] tabular-nums text-muted-ink">{formatSenegalPhone(customer.phone)}</span>
                </div>
              </div>

              {/* Contact (mobile : en haut à droite ; ordinateur : dernière colonne) */}
              <div className="relative z-10 flex gap-2 lg:order-last">
                <ContactButtons phone={customer.phone} customerName={customer.fullName} />
              </div>

              {/* Statistiques */}
              <div className="col-span-2 grid grid-cols-4 gap-3 text-sm lg:contents">
                <Stat label="Pointure">{customer.usualSize ? <span className="font-display text-xl">{customer.usualSize}</span> : <span className="text-muted-ink">—</span>}</Stat>
                <Stat label="Commandes">
                  <span className="font-semibold tabular-nums">{customer.orders}</span>
                </Stat>
                <Stat label="Dépensé">
                  <span className="font-semibold tabular-nums">{customer.spent > 0 ? formatFCFA(customer.spent) : <span className="font-normal text-muted-ink">—</span>}</span>
                </Stat>
                <Stat label="Dernière">
                  <span className="text-muted-ink" suppressHydrationWarning>
                    {customer.lastOrderAt ? formatRelative(customer.lastOrderAt) : 'Aucune'}
                  </span>
                </Stat>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-ink lg:hidden">{label}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
