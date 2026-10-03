import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, MessageCircle } from 'lucide-react';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { formatFCFA } from '@/lib/money';
import { formatSenegalPhone } from '@/lib/phone';
import { whatsappLink, whatsappOrderMessage } from '@/lib/whatsapp';
import { getStoreSettings } from '@/features/settings/queries';

export const metadata: Metadata = {
  title: 'Commande passée',
  robots: { index: false, follow: false },
};

/**
 * « Commande passée ! » : l'identifiant de la commande (UUID aléatoire) sert de lien
 * privé de suivi. On n'y montre que ce que le client vient de saisir.
 */
export default async function OrderPlacedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [order, settings] = await Promise.all([
    withDbRetry(() =>
      prisma.order.findUnique({
        where: { id },
        select: {
          reference: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          customerName: true,
          customerPhone: true,
          deliveryZoneName: true,
          deliveryAddress: true,
          subtotal: true,
          deliveryFee: true,
          discountAmount: true,
          promotionCode: true,
          total: true,
          deliveryZone: { select: { estimatedDelay: true } },
          items: { orderBy: { createdAt: 'asc' }, select: { id: true, productName: true, colorwayName: true, sizeEu: true, quantity: true, unitPrice: true, unitDiscount: true } },
        },
      }),
    ),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const firstName = order.customerName.split(' ')[0];
  const wave = order.paymentMethod === 'WAVE';
  const paid = order.paymentStatus === 'PAID';
  const delay = order.deliveryZone?.estimatedDelay;
  const help = whatsappLink(settings.whatsappNumber, whatsappOrderMessage(order.reference));
  const cancelled = order.status === 'CANCELLED';

  const steps = [
    wave && !paid
      ? { title: 'On vérifie ton paiement Wave', text: `Et on t’appelle au ${formatSenegalPhone(order.customerPhone)} pour confirmer.` }
      : { title: 'On t’appelle pour confirmer', text: `Au ${formatSenegalPhone(order.customerPhone)}, dans les meilleurs délais.` },
    { title: 'On prépare tes paires', text: 'Neuves, dans leur boîte d’origine.' },
    {
      title: `Livraison${order.deliveryZoneName ? ` ${order.deliveryZoneName}` : ''}${delay ? `, ${delay}` : ''}`,
      text: wave ? order.deliveryAddress : `${order.deliveryAddress} · tu paies le livreur à la réception.`,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[67.5rem] flex-col gap-3 px-3 pb-10 pt-1.5 lg:gap-6 lg:px-0 lg:pt-12">
      {/* Succès */}
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-[32px] bg-section px-[22px] py-7 text-deep lg:items-center lg:gap-4 lg:rounded-[44px] lg:px-12 lg:py-14 lg:text-center">
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-[-16px] font-display text-[8.75rem] leading-none text-[#EBC9D7] lg:-bottom-20 lg:left-0 lg:right-0 lg:text-[16.25rem]">
          Merci
        </span>
        <span className="relative grid size-[60px] place-items-center rounded-full bg-accent text-white shadow-[0_14px_28px_-10px_rgba(230,0,126,0.7)] lg:size-[92px]">
          <Check className="size-7 lg:size-[42px]" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <h1 className="relative font-display text-[2.375rem] leading-none lg:mt-1.5 lg:text-[3.625rem]">{cancelled ? 'Commande annulée' : 'Commande passée !'}</h1>
        <p className="relative max-w-[35rem] text-[0.90625rem] leading-normal text-section-ink lg:text-[1.0625rem]">
          {cancelled ? (
            <>
              La commande <strong className="text-deep">{order.reference}</strong> a été annulée. Écris-nous si c’est une erreur.
            </>
          ) : (
            <>
              Merci {firstName}. Ta commande <strong className="text-deep">{order.reference}</strong> est bien enregistrée et tes paires sont mises de côté.
            </>
          )}
        </p>
      </section>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
        {/* Et maintenant */}
        {!cancelled && (
          <section aria-labelledby="next-title" className="flex flex-col gap-4 rounded-[28px] bg-deep p-5 text-cream lg:gap-5 lg:rounded-[36px] lg:p-8">
            <h2 id="next-title" className="font-display text-2xl lg:text-[2rem]">
              Et maintenant ?
            </h2>
            <ol className="flex flex-col gap-2.5 lg:gap-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-3.5 rounded-[20px] bg-deep-line p-4 lg:gap-4 lg:rounded-[22px] lg:p-[18px]">
                  <span className="font-display text-[1.75rem] leading-none text-accent-soft lg:text-[2.125rem]">{index + 1}</span>
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[0.90625rem] lg:text-[0.96875rem]">{step.title}</strong>
                    <span className="text-[0.8125rem] text-deep-ink lg:text-[0.84375rem]">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-[0.78125rem] text-deep-ink lg:text-[0.8125rem]">Garde cette page : son lien te permet de suivre ta commande.</p>
          </section>
        )}

        {/* Résumé */}
        <aside className="flex flex-col gap-3 lg:gap-3.5">
          <section aria-labelledby="sum-title" className="flex flex-col gap-3 rounded-[28px] border border-border bg-surface p-5 lg:gap-3.5 lg:rounded-[32px] lg:p-[26px]">
            <h2 id="sum-title" className="font-display text-2xl lg:text-[1.625rem]">
              Ta commande
            </h2>
            {order.items.map((item) => (
              <p key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0">
                  {item.productName} · {item.colorwayName} · {item.sizeEu}
                  {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
                </span>
                <strong className="whitespace-nowrap tabular-nums">{formatFCFA((item.unitPrice - item.unitDiscount) * item.quantity)}</strong>
              </p>
            ))}
            {order.discountAmount > 0 && (
              <p className="flex justify-between gap-4 text-sm text-accent-ink">
                <span>Code {order.promotionCode}</span>
                <strong className="tabular-nums">−{formatFCFA(order.discountAmount)}</strong>
              </p>
            )}
            <p className="flex justify-between gap-4 text-sm text-muted-ink">
              <span>Livraison {order.deliveryZoneName}</span>
              <span className="tabular-nums">{order.deliveryFee === 0 ? 'Offerte' : formatFCFA(order.deliveryFee)}</span>
            </p>
            <p className="flex items-baseline justify-between border-t border-ink pt-3">
              <strong className="text-[0.8125rem] tracking-[0.14em]">TOTAL</strong>
              <strong className="font-display text-[1.875rem] font-normal tabular-nums">{formatFCFA(order.total)}</strong>
            </p>
            <span className="flex h-[34px] items-center self-start rounded-full bg-section px-3 text-[0.78125rem] font-semibold text-section-ink">
              {wave ? (paid ? 'Payée par Wave' : 'Wave · paiement en vérification') : 'Paiement à la livraison'}
            </span>
          </section>
          {help && (
            <a href={help} target="_blank" rel="noopener noreferrer" className="flex h-[54px] items-center justify-center gap-2 rounded-full border-[1.5px] border-ink text-sm font-semibold">
              <MessageCircle className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
              Une question ? WhatsApp
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          )}
          <Link href="/boutique" className="flex h-[54px] items-center justify-center rounded-full bg-deep text-sm font-semibold text-cream">
            Continuer mes achats
          </Link>
        </aside>
      </div>
    </div>
  );
}
