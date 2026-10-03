import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, Clock, ImageOff, MapPin, MessageSquareQuote, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatFullDate, formatRelative, hoursSince } from '@/lib/dates';
import { formatSenegalPhone } from '@/lib/phone';
import { getOrderDetail } from '@/features/orders/queries';
import { ORDER_STATUS_UI, WAITING_ALERT_HOURS } from '@/features/orders/labels';
import { ContactButtons, PaymentChip, StatusChip, expiryLabel } from '@/features/orders/components/order-ui';
import OrderProgress from '@/features/orders/components/OrderProgress';
import OrderActionsPanel from '@/features/orders/components/OrderActionsPanel';
import PaymentPanel from '@/features/orders/components/PaymentPanel';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = z.uuid().safeParse(id).success ? await getOrderDetail(id) : null;
  return { title: `${order ? order.reference : 'Commande introuvable'} · Administration`, robots: { index: false, follow: false } };
}

const card = 'flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5 sm:p-6';
const cardTitle = 'font-display text-[1.375rem]';

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const waitingLong = order.status === 'PENDING' && hoursSince(order.createdAt) >= WAITING_ALERT_HOURS;
  const expiry = order.status === 'PENDING' ? expiryLabel(order.expiresAt) : null;
  const pairs = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-3">
        <Link href="/admin/commandes" className="flex h-9 w-fit items-center gap-1.5 pr-2 text-sm text-muted-ink hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Commandes
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-[2rem] leading-none tabular-nums lg:text-[2.5rem]">{order.reference}</h1>
          <StatusChip status={order.status} />
          <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-ink" suppressHydrationWarning>
          <span>
            Passée {formatRelative(order.createdAt)} · {formatFullDate(order.createdAt)}
          </span>
          {waitingLong && (
            <span className="flex items-center gap-1 font-semibold text-accent-ink">
              <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" />
              Le client attend une confirmation
            </span>
          )}
          {expiry && <span className={cn('font-medium', expiry.urgent ? 'text-accent-ink' : 'text-ink')}>{expiry.text}</span>}
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-5">
        {/* Colonne d'action (en premier sur mobile) */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:order-2">
          <OrderActionsPanel order={order} />

          <section aria-labelledby="customer-title" className={card}>
            <h2 id="customer-title" className={cardTitle}>
              Client
            </h2>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-section font-display text-lg text-section-ink">
                {order.customerName.charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[0.9375rem] font-medium">{order.customerName}</span>
                <span className="text-sm tabular-nums text-muted-ink">{formatSenegalPhone(order.customerPhone)}</span>
              </div>
              <div className="flex gap-2">
                <ContactButtons phone={order.customerPhone} customerName={order.customerName} reference={order.reference} />
              </div>
            </div>
            {order.customerPhoneAlt && (
              <a href={`tel:${order.customerPhoneAlt}`} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-[0.8125rem]">
                <Phone className="size-3.5 text-muted-ink" strokeWidth={1.8} aria-hidden="true" />
                Second numéro : <span className="font-medium tabular-nums">{formatSenegalPhone(order.customerPhoneAlt)}</span>
              </a>
            )}
            {order.customerOrderCount !== null && (
              <p className={cn('rounded-xl px-3 py-2 text-[0.8125rem]', order.customerOrderCount > 1 ? 'bg-[#E3F1E6] text-[#1F6B3A]' : 'bg-card text-muted-ink')}>
                {order.customerOrderCount > 1 ? `Déjà ${order.customerOrderCount} commandes passées chez Mariemeshoes.` : 'Première commande de ce client.'}
              </p>
            )}
            {order.customer && (
              <Link
                href={`/admin/clients/${order.customer.id}`}
                className="flex h-11 items-center justify-center rounded-full border border-border text-sm font-medium transition-colors hover:border-ink"
              >
                Voir la fiche client
              </Link>
            )}
          </section>

          <PaymentPanel order={order} />
        </aside>

        {/* Colonne principale */}
        <div className="flex min-w-0 flex-col gap-4 lg:order-1 lg:gap-5">
          <section aria-label="Progression" className={card}>
            <OrderProgress order={order} />
          </section>

          {/* Paires */}
          <section aria-labelledby="items-title" className={card}>
            <h2 id="items-title" className={cardTitle}>
              Paires <span className="font-sans text-sm font-normal text-muted-ink">({pairs})</span>
            </h2>
            {order.items.length === 0 ? (
              <p className="text-sm text-muted-ink">Aucun article dans cette commande.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {order.items.map((item) => {
                  const thumb = (
                    <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-card">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt="" width={128} height={128} sizes="64px" className="size-full object-contain p-1.5 mix-blend-multiply" />
                      ) : (
                        <ImageOff className="size-5 text-muted-ink" strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </span>
                  );
                  return (
                    <li key={item.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                      {item.productId ? (
                        <Link href={`/admin/produits/${item.productId}`} aria-label={`Fiche produit : ${item.productName}`}>
                          {thumb}
                        </Link>
                      ) : (
                        thumb
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[0.9375rem] font-medium leading-snug">
                          {item.brandName} {item.productName} <span className="font-normal text-muted-ink">· {item.colorwayName}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-ink">
                          <span className="rounded-full bg-deep px-2.5 py-0.5 text-xs font-semibold text-cream">Pointure {item.sizeEu}</span>
                          <span className="tabular-nums">
                            {item.quantity} × {formatFCFA(item.unitPrice)}
                          </span>
                          <span className="text-xs">SKU {item.sku}</span>
                          {!item.variantId && <span className="text-xs">(article retiré du catalogue)</span>}
                        </span>
                      </div>
                      <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{formatFCFA(item.lineTotal)}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-ink">Sous-total</dt>
                <dd className="tabular-nums">{formatFCFA(order.subtotal)}</dd>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-ink">Remise</dt>
                  <dd className="tabular-nums text-[#1F6B3A]">− {formatFCFA(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-ink">Livraison{order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ''}</dt>
                <dd className="tabular-nums">{order.deliveryFee === 0 ? 'Offerte' : formatFCFA(order.deliveryFee)}</dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-[1.625rem] tabular-nums">{formatFCFA(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Livraison */}
          <section aria-labelledby="delivery-title" className={card}>
            <h2 id="delivery-title" className={cardTitle}>
              Livraison
            </h2>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-accent-ink">
                <MapPin className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <address className="flex flex-col gap-0.5 text-[0.9375rem] not-italic leading-snug">
                <span className="font-medium">{order.deliveryAddress}</span>
                <span className="text-muted-ink">{order.deliveryZoneName ? `Zone ${order.deliveryZoneName}` : 'Zone non précisée'}</span>
              </address>
            </div>
            {order.deliveryNotes ? (
              <p className="flex items-start gap-2.5 rounded-2xl bg-section/60 px-4 py-3 text-sm leading-relaxed">
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-section-ink" strokeWidth={1.7} aria-hidden="true" />
                <span>
                  <span className="sr-only">Indications du client : </span>« {order.deliveryNotes} »
                </span>
              </p>
            ) : (
              <p className="text-[0.8125rem] text-muted-ink">Pas d’indication particulière (point de repère, horaires…).</p>
            )}
          </section>

          {/* Historique */}
          <section aria-labelledby="history-title" className={card}>
            <h2 id="history-title" className={cardTitle}>
              Historique
            </h2>
            <ol className="flex flex-col">
              <li className="relative flex gap-3.5 pb-5 last:pb-0">
                {order.history.length > 0 && <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-px bg-border" />}
                <span aria-hidden="true" className="relative mt-1 size-[15px] shrink-0 rounded-full bg-deep ring-4 ring-surface" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Commande reçue</span>
                  <span className="text-[0.8125rem] text-muted-ink" suppressHydrationWarning>
                    {formatFullDate(order.createdAt)} · passée sur la boutique
                  </span>
                </div>
              </li>
              {order.history
                .filter((entry) => entry.fromStatus !== null)
                .map((entry, index, list) => {
                  const last = index === list.length - 1;
                  return (
                    <li key={entry.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {!last && <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-px bg-border" />}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative mt-1 size-[15px] shrink-0 rounded-full ring-4 ring-surface',
                          entry.toStatus === 'CANCELLED' || entry.toStatus === 'RETURNED' ? 'bg-muted' : last ? 'bg-accent' : 'bg-deep',
                        )}
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{ORDER_STATUS_UI[entry.toStatus].label}</span>
                        <span className="text-[0.8125rem] text-muted-ink" suppressHydrationWarning>
                          {formatFullDate(entry.createdAt)}
                          {entry.changedByName ? ` · ${entry.changedByName}` : ''}
                        </span>
                        {entry.note && <span className="text-[0.8125rem]">{entry.note}</span>}
                      </div>
                    </li>
                  );
                })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
