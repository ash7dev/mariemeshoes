'use client';

import { useState, useTransition } from 'react';
import { ArrowRight, LoaderCircle, PackageCheck, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import {
  cancelOrderAction,
  confirmOrderAction,
  deliverOrderAction,
  prepareOrderAction,
  returnOrderAction,
  shipOrderAction,
  type OrderActionResult,
} from '../actions';
import type { OrderDetail } from '../queries';

type Mode = 'idle' | 'cancel' | 'return';

const CANCEL_REASONS = ['Client injoignable', 'Le client a changé d’avis', 'Paiement Wave non reçu', 'Refus à la livraison', 'Pointure indisponible'];

const primary =
  'flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-70';
const secondary =
  'flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:border-ink disabled:opacity-60';

/** Prochaine étape de la commande, annulation (motif obligatoire) et retour. */
export default function OrderActionsPanel({ order }: { order: OrderDetail }) {
  const [mode, setMode] = useState<Mode>('idle');
  const [reason, setReason] = useState('');
  const [collected, setCollected] = useState(true);
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<OrderActionResult>) =>
    startTransition(async () => {
      const outcome = await fn();
      setResult(outcome);
      if (outcome.ok) {
        setMode('idle');
        setReason('');
      }
    });

  const codUnpaid = order.paymentMethod === 'CASH_ON_DELIVERY' && order.paymentStatus !== 'PAID';
  const closed = order.status === 'CANCELLED' || order.status === 'RETURNED';
  const cancellable = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED'].includes(order.status);
  const spinner = pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />;

  return (
    <section aria-labelledby="actions-title" className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5 sm:p-6">
      <h2 id="actions-title" className="font-display text-[1.375rem]">
        {closed ? 'Commande clôturée' : order.status === 'DELIVERED' ? 'Après livraison' : 'Prochaine étape'}
      </h2>

      {result && (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={cn('rounded-2xl px-4 py-3 text-sm', result.ok ? 'bg-[#E3F1E6] text-[#1F6B3A]' : 'bg-[#FBE3EE] text-accent-ink')}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}

      {mode === 'idle' && (
        <div className="flex flex-col gap-2.5">
          {order.status === 'PENDING' && (
            <>
              <p className="text-[0.8125rem] leading-relaxed text-muted-ink">
                Appelle ou écris au client pour vérifier la pointure et l’adresse, puis confirme : la réservation des paires devient définitive.
              </p>
              <button type="button" disabled={pending} onClick={() => act(() => confirmOrderAction(order.id))} className={primary}>
                {spinner}
                Confirmer la commande
              </button>
            </>
          )}

          {order.status === 'CONFIRMED' && (
            <>
              <button type="button" disabled={pending} onClick={() => act(() => prepareOrderAction(order.id))} className={primary}>
                {spinner}
                <PackageCheck className="size-4" strokeWidth={1.8} aria-hidden="true" />
                Lancer la préparation
              </button>
              <button type="button" disabled={pending} onClick={() => act(() => shipOrderAction(order.id))} className={secondary}>
                <Truck className="size-4" strokeWidth={1.8} aria-hidden="true" />
                Remettre directement au livreur
              </button>
            </>
          )}

          {order.status === 'PREPARING' && (
            <button type="button" disabled={pending} onClick={() => act(() => shipOrderAction(order.id))} className={primary}>
              {spinner}
              <Truck className="size-4" strokeWidth={1.8} aria-hidden="true" />
              Remettre au livreur
            </button>
          )}

          {order.status === 'SHIPPED' && (
            <>
              {codUnpaid && (
                <label className="flex items-start gap-2.5 rounded-2xl bg-card px-4 py-3 text-sm">
                  <input type="checkbox" checked={collected} onChange={(event) => setCollected(event.target.checked)} className="mt-0.5 size-4 accent-[#E6007E]" />
                  <span>
                    Le livreur a encaissé <strong className="tabular-nums">{formatFCFA(order.total)}</strong>
                  </span>
                </label>
              )}
              <button type="button" disabled={pending} onClick={() => act(() => deliverOrderAction(order.id, codUnpaid && collected))} className={primary}>
                {spinner}
                Commande livrée
                <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          )}

          {order.status === 'DELIVERED' && (
            <>
              <p className="text-[0.8125rem] leading-relaxed text-muted-ink">
                Si le client rend la paire, enregistre le retour : elle revient en stock, vendable comme neuve.
              </p>
              <button type="button" onClick={() => setMode('return')} className={secondary}>
                Enregistrer un retour
              </button>
            </>
          )}

          {closed && (
            <p className="text-[0.8125rem] leading-relaxed text-muted-ink">
              Plus aucune action possible. Les paires de cette commande sont revenues en stock.
            </p>
          )}

          {cancellable && (
            <button
              type="button"
              onClick={() => {
                setMode('cancel');
                setResult(null);
                if (order.status === 'SHIPPED') setReason('Refus à la livraison');
              }}
              className="h-10 self-center text-[0.8125rem] font-medium text-accent-ink underline-offset-4 hover:underline"
            >
              {order.status === 'SHIPPED' ? 'Refus à la livraison / annuler' : 'Annuler la commande'}
            </button>
          )}
        </div>
      )}

      {(mode === 'cancel' || mode === 'return') && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            act(() => (mode === 'cancel' ? cancelOrderAction(order.id, reason) : returnOrderAction(order.id, reason)));
          }}
          className="flex flex-col gap-3 rounded-2xl bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{mode === 'cancel' ? 'Annuler la commande' : 'Retour du client'}</span>
            <button
              type="button"
              onClick={() => setMode('idle')}
              aria-label="Fermer"
              className="grid size-9 place-items-center rounded-full text-muted-ink hover:bg-border hover:text-ink"
            >
              <X className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          {mode === 'cancel' && (
            <div className="flex flex-wrap gap-1.5">
              {CANCEL_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={cn('h-8 rounded-full px-3 text-xs', reason === preset ? 'bg-deep text-cream' : 'bg-surface hover:bg-border')}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
          <label htmlFor="order-reason" className="sr-only">
            {mode === 'cancel' ? 'Motif de l’annulation' : 'Raison du retour'}
          </label>
          <textarea
            id="order-reason"
            value={reason}
            required
            maxLength={300}
            rows={2}
            onChange={(event) => setReason(event.target.value)}
            placeholder={mode === 'cancel' ? 'Motif (obligatoire)' : 'Raison du retour (obligatoire)'}
            className="resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-muted-ink">Les paires reviendront en stock.</p>
          <button
            type="submit"
            disabled={pending || !reason.trim()}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-accent-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {spinner}
            {mode === 'cancel' ? 'Confirmer l’annulation' : 'Confirmer le retour'}
          </button>
        </form>
      )}
    </section>
  );
}
