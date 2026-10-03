import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, ChevronRight, ImageOff, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatFullDate, formatRelative } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { getCustomerDetail, LOYAL_MIN_ORDERS } from '@/features/customers/queries';
import { ContactButtons, PaymentChip, StatusChip } from '@/features/orders/components/order-ui';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = z.uuid().safeParse(id).success ? await getCustomerDetail(id) : null;
  return { title: `${customer ? customer.fullName : 'Client introuvable'} · Administration`, robots: { index: false, follow: false } };
}

const card = 'flex min-w-0 flex-col gap-4 rounded-[24px] border border-border bg-surface p-4 sm:rounded-[28px] sm:p-6';
const cardTitle = 'font-display text-[1.375rem]';
const dateOnly = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Dakar' });

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  const loyal = customer.stats.orders >= LOYAL_MIN_ORDERS;
  const stats = [
    { label: 'Commandes', value: String(customer.stats.orders), hint: customer.stats.cancelled ? `+ ${customer.stats.cancelled} annulée${customer.stats.cancelled > 1 ? 's' : ''}` : null },
    { label: 'Dépensé', value: customer.stats.spent ? formatFCFA(customer.stats.spent) : '—', hint: 'commandes livrées' },
    { label: 'Panier moyen', value: customer.stats.averageBasket ? formatFCFA(customer.stats.averageBasket) : '—', hint: null },
    { label: 'Pointure habituelle', value: customer.sizes[0] ? String(customer.sizes[0].key) : '—', hint: customer.stats.pairs ? `${customer.stats.pairs} paire${customer.stats.pairs > 1 ? 's' : ''} achetée${customer.stats.pairs > 1 ? 's' : ''}` : null },
  ];

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4">
        <Link href="/admin/clients" className="flex h-9 w-fit items-center gap-1.5 pr-2 text-sm text-muted-ink hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Clients
        </Link>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span aria-hidden="true" className={cn('grid size-14 shrink-0 place-items-center rounded-full font-display text-2xl sm:size-16', loyal ? 'bg-deep text-cream' : 'bg-section text-section-ink')}>
            {customer.fullName.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words font-display text-[1.75rem] leading-tight sm:text-[2rem] lg:text-[2.5rem]">{customer.fullName}</h1>
              {loyal && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">Fidèle</span>}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-ink">
              <span className="font-medium tabular-nums text-ink">{formatSenegalPhone(customer.phone)}</span>
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex min-w-0 max-w-full items-center gap-1 hover:text-ink">
                  <Mail className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="truncate">{customer.email}</span>
                </a>
              )}
              <span>Client depuis le {dateOnly.format(customer.createdAt)}</span>
            </p>
          </div>
          {/* Mobile : sous le nom, sur toute la ligne ; ordinateur : à droite. */}
          <div className="flex w-full gap-2 sm:w-auto">
            <ContactButtons phone={customer.phone} customerName={customer.fullName} />
          </div>
        </div>
      </header>

      {/* Chiffres */}
      <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-border bg-surface p-4 sm:rounded-[24px] sm:p-5">
            <span className="text-[0.8125rem] text-muted-ink">{stat.label}</span>
            <span className="break-words font-display text-[1.3125rem] leading-tight tabular-nums sm:text-[1.75rem] sm:leading-none">{stat.value}</span>
            {stat.hint && <span className="text-xs text-muted-ink">{stat.hint}</span>}
          </div>
        ))}
      </section>

      {/* minmax(0, 1fr) : une ligne longue (adresse, paire) ne fait jamais déborder la page sur mobile. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
        {/* Commandes */}
        <section aria-labelledby="orders-title" className={card}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="orders-title" className={cardTitle}>
              Commandes
            </h2>
            {customer.stats.lastOrderAt && (
              <span className="text-[0.8125rem] text-muted-ink" suppressHydrationWarning>
                dernière {formatRelative(customer.stats.lastOrderAt)}
              </span>
            )}
          </div>
          {customer.orders.length === 0 ? (
            <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-ink">Aucune commande pour l’instant.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {customer.orders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/commandes/${order.id}`} className="group flex items-center gap-3 py-3 sm:gap-3.5">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-card sm:size-14">
                      {order.firstItem?.imageUrl ? (
                        <Image src={order.firstItem.imageUrl} alt="" width={112} height={112} sizes="56px" className="size-full object-contain p-1 mix-blend-multiply" />
                      ) : (
                        <ImageOff className="size-5 text-muted-ink" strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums group-hover:text-accent-ink">{order.reference}</span>
                        <StatusChip status={order.status} />
                        <PaymentChip method={order.paymentMethod} status={order.paymentStatus} className="hidden sm:inline-flex" />
                      </span>
                      <span className="truncate text-[0.8125rem] text-muted-ink" suppressHydrationWarning>
                        {formatFullDate(order.createdAt)}
                        {order.firstItem ? ` · ${order.firstItem.label} · ${order.firstItem.sizeEu}` : ''}
                        {order.pairs > 1 ? ` · ${order.pairs} paires` : ''}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums sm:text-base">{formatFCFA(order.total)}</span>
                    <ChevronRight className="hidden size-4 shrink-0 text-muted-ink sm:block" strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {/* Pointures et marques */}
          <section aria-labelledby="taste-title" className={card}>
            <h2 id="taste-title" className={cardTitle}>
              Ses paires
            </h2>
            {customer.sizes.length === 0 ? (
              <p className="text-sm text-muted-ink">Rien acheté pour l’instant.</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.8125rem] font-medium text-muted-ink">Pointures</span>
                  <ul className="flex flex-wrap gap-2">
                    {customer.sizes.map(({ key, count }, index) => (
                      <li
                        key={key}
                        className={cn('flex h-10 items-center gap-1.5 rounded-xl px-3', index === 0 ? 'bg-accent text-white' : 'bg-card')}
                        title={`${count} paire${count > 1 ? 's' : ''}`}
                      >
                        <span className="font-display text-lg">{key}</span>
                        <span className={cn('text-xs', index === 0 ? 'text-white/80' : 'text-muted-ink')}>×{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.8125rem] font-medium text-muted-ink">Marques</span>
                  <ul className="flex flex-wrap gap-2">
                    {customer.brands.map(({ key, count }) => (
                      <li key={key} className="rounded-full border border-border px-3 py-1 text-sm">
                        {key} <span className="text-muted-ink">×{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </section>

          {/* Adresses */}
          <section aria-labelledby="addresses-title" className={card}>
            <h2 id="addresses-title" className={cardTitle}>
              Adresses de livraison
            </h2>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-muted-ink">Aucune adresse enregistrée.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {customer.addresses.map((address) => (
                  <li key={address.address} className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-accent-ink">
                      <MapPin className="size-4" strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                      <span className="break-words font-medium leading-snug">{address.address}</span>
                      <span className="text-xs text-muted-ink" suppressHydrationWarning>
                        {address.zone ? `${address.zone} · ` : ''}utilisée {formatRelative(address.lastUsedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
