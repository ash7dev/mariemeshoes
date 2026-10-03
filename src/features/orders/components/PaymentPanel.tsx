'use client';

import { useState, useTransition } from 'react';
import { Banknote, LoaderCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatFullDate } from '@/lib/dates';
import { markOrderPaidAction, markOrderUnpaidAction, markPaymentFailedAction, refundOrderAction, type OrderActionResult } from '../actions';
import type { OrderDetail } from '../queries';
import { PaymentChip } from './order-ui';

type Confirm = 'refund' | 'unpay' | null;

/** Paiement : vérifier Wave (référence), encaisser, rembourser, corriger une erreur de saisie. */
export default function PaymentPanel({ order }: { order: OrderDetail }) {
  const [reference, setReference] = useState(order.payment?.waveReference ?? '');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const isWave = order.paymentMethod === 'WAVE';
  const cancelled = order.status === 'CANCELLED';
  const awaiting = (order.paymentStatus === 'PENDING' || order.paymentStatus === 'FAILED') && !cancelled;

  const act = (fn: () => Promise<OrderActionResult>) =>
    startTransition(async () => {
      const outcome = await fn();
      setResult(outcome);
      if (outcome.ok) setConfirm(null);
    });

  const spinner = pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />;

  return (
    <section aria-labelledby="payment-title" className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="payment-title" className="font-display text-[1.375rem]">
          Paiement
        </h2>
        <PaymentChip method={order.paymentMethod} status={order.paymentStatus} />
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', isWave ? 'bg-accent text-white' : 'bg-deep text-cream')}>
          {isWave ? <Smartphone className="size-[18px]" strokeWidth={1.7} aria-hidden="true" /> : <Banknote className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{isWave ? 'Wave (code marchand)' : 'Paiement à la livraison'}</span>
          <span className="text-base font-semibold tabular-nums">{formatFCFA(order.total)}</span>
        </span>
      </div>

      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={cn('rounded-2xl px-4 py-3 text-sm', result.ok ? 'bg-[#E3F1E6] text-[#1F6B3A]' : 'bg-[#FBE3EE] text-accent-ink')}>
          {result.ok ? result.message : result.error}
        </p>
      )}

      {/* En attente / échec */}
      {awaiting && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.8125rem] leading-relaxed text-muted-ink">
            {isWave ? (
              <>
                Vérifie dans <strong className="font-semibold text-ink">Wave Business</strong> un paiement de{' '}
                <strong className="font-semibold text-ink">{formatFCFA(order.total)}</strong> au nom de {order.customerName}, référence{' '}
                <strong className="font-semibold tabular-nums text-ink">{order.reference}</strong>.
              </>
            ) : (
              <>Le livreur encaisse {formatFCFA(order.total)} à la remise. Tu peux aussi le noter en marquant la commande livrée.</>
            )}
          </p>
          {order.paymentStatus === 'FAILED' && <p className="text-[0.8125rem] font-medium text-accent-ink">Paiement marqué comme non abouti.</p>}
          {isWave && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wave-reference" className="text-[0.8125rem] font-medium">
                Référence de la transaction Wave <span className="font-normal text-muted-ink">(conseillée)</span>
              </label>
              <input
                id="wave-reference"
                value={reference}
                maxLength={80}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Ex. T_ABC123XYZ"
                className="h-11 rounded-xl border border-border bg-page px-3.5 text-sm tabular-nums outline-none placeholder:text-muted focus:border-accent"
              />
              <p className="text-xs text-muted-ink">Une même référence ne peut valider qu’une seule commande.</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => act(() => markOrderPaidAction(order.id, reference))}
            disabled={pending}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-70"
          >
            {spinner}
            {isWave ? 'Paiement Wave reçu' : 'Marquer comme encaissée'}
          </button>
          {isWave && order.paymentStatus === 'PENDING' && (
            <button
              type="button"
              onClick={() => act(() => markPaymentFailedAction(order.id))}
              disabled={pending}
              className="h-9 self-center text-[0.8125rem] text-muted-ink underline-offset-4 hover:text-ink hover:underline"
            >
              Aucun paiement reçu
            </button>
          )}
        </div>
      )}

      {order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUNDED' && cancelled && (
        <p className="text-[0.8125rem] text-muted-ink">Commande annulée : aucun paiement attendu.</p>
      )}

      {/* Payée */}
      {order.paymentStatus === 'PAID' && (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-1.5 text-[0.8125rem]">
            {order.payment?.confirmedAt && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-ink">Encaissé</dt>
                <dd className="text-right" suppressHydrationWarning>
                  {formatFullDate(order.payment.confirmedAt)}
                </dd>
              </div>
            )}
            {order.payment?.confirmedByName && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-ink">Constaté par</dt>
                <dd>{order.payment.confirmedByName}</dd>
              </div>
            )}
            {order.payment?.waveReference && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-ink">Référence Wave</dt>
                <dd className="tabular-nums">{order.payment.waveReference}</dd>
              </div>
            )}
          </dl>

          {confirm ? (
            <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-3.5">
              <p className="text-[0.8125rem] leading-snug">
                {confirm === 'refund'
                  ? `Confirmer le remboursement de ${formatFCFA(order.total)} au client ?`
                  : 'Annuler ce paiement ? À utiliser seulement pour corriger une erreur de saisie.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => act(() => (confirm === 'refund' ? refundOrderAction(order.id) : markOrderUnpaidAction(order.id)))}
                  disabled={pending}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-accent-ink px-4 text-[0.8125rem] font-semibold text-white disabled:opacity-70"
                >
                  {spinner}
                  Confirmer
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="h-10 rounded-full px-3 text-[0.8125rem] text-muted-ink hover:text-ink">
                  Retour
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <button type="button" onClick={() => setConfirm('refund')} className="h-9 text-[0.8125rem] font-medium underline-offset-4 hover:underline">
                Enregistrer un remboursement
              </button>
              <button type="button" onClick={() => setConfirm('unpay')} className="h-9 text-[0.8125rem] text-muted-ink underline-offset-4 hover:text-ink hover:underline">
                Erreur de saisie ?
              </button>
            </div>
          )}
        </div>
      )}

      {order.paymentStatus === 'REFUNDED' && <p className="text-[0.8125rem] text-muted-ink">Paiement remboursé au client.</p>}
    </section>
  );
}
