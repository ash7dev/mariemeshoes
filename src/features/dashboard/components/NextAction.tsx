'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CircleCheck, Clock, ImageOff, LoaderCircle, MessageCircle, Phone, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { whatsappLink } from '@/lib/whatsapp';
import { formatSenegalPhone } from '@/lib/phone';
import { confirmOrderAction } from '@/features/orders/actions';
import { WAITING_ALERT_HOURS } from '@/features/orders/labels';
import type { QueueItem } from '../queries';
import { initials, num } from '../format';

/** « 12 min », « 2 h 40 », « 3 j » */
function waited(since: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return minutes % 60 ? `${h} h ${String(minutes % 60).padStart(2, '0')}` : `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

/**
 * « Prochaine action · 1 / 3 » : une commande à la fois, la plus urgente d'abord
 * (à confirmer, puis Wave à vérifier). « Plus tard » la renvoie en fin de file pour
 * cette visite ; une action faite disparaît au rafraîchissement des données.
 */
export default function NextAction({ queue, variant = 'desktop' }: { queue: QueueItem[]; variant?: 'desktop' | 'mobile' }) {
  const [order, setOrder] = useState(() => queue.map((i) => i.key));
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Nouvelles données : on garde l'ordre choisi (« plus tard »), on ajoute le reste.
  useEffect(() => {
    setOrder((current) => {
      const keys = new Set(queue.map((i) => i.key));
      const kept = current.filter((k) => keys.has(k));
      return [...kept, ...queue.map((i) => i.key).filter((k) => !kept.includes(k))];
    });
  }, [queue]);

  const items = useMemo(() => {
    const byKey = new Map(queue.map((i) => [i.key, i]));
    return order.map((k) => byKey.get(k)).filter((i): i is QueueItem => Boolean(i));
  }, [order, queue]);

  const item = items[0];
  const mobile = variant === 'mobile';

  if (!item) {
    return (
      <section aria-label="Prochaine action" className={cn('flex flex-col items-center justify-center gap-3 rounded-[32px] border border-border bg-surface p-6 text-center', mobile ? 'rounded-[28px] py-8' : 'min-h-[22rem]')}>
        <span className="grid size-14 place-items-center rounded-full bg-[#E3F1E6] text-[#1F6B3A]">
          <CircleCheck className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="font-display text-[1.375rem]">Rien à traiter</p>
        <p className="max-w-xs text-[0.8125rem] text-muted-ink">
          {result?.ok ? result.message : 'Aucune commande à confirmer, aucun paiement Wave à vérifier. Les nouvelles commandes apparaîtront ici.'}
        </p>
      </section>
    );
  }

  const late = item.kind === 'confirm' && (Date.now() - new Date(item.since).getTime()) / 3_600_000 >= WAITING_ALERT_HOURS;
  const firstName = item.customerName.split(' ')[0];
  const wa = whatsappLink(item.customerPhone, `Bonjour ${firstName}, ici Mariemeshoes au sujet de votre commande ${item.reference}.`);
  const chip =
    item.kind === 'confirm'
      ? { label: `À confirmer · ${waited(item.since)}`, className: late ? 'bg-accent text-white' : 'bg-[#FBE3EE] text-accent-ink' }
      : { label: `Wave à vérifier · ${waited(item.since)}`, className: 'bg-section text-section-ink' };

  const later = () => {
    setResult(null);
    setOrder((current) => [...current.slice(1), current[0]]);
  };

  const confirm = () =>
    startTransition(async () => {
      const outcome = await confirmOrderAction(item.orderId);
      setResult(outcome.ok ? { ok: true, message: `${item.reference} confirmée.` } : { ok: false, message: outcome.error });
    });

  return (
    <section
      aria-labelledby={`next-action-${variant}`}
      className={cn('flex flex-col gap-4 border border-border bg-surface', mobile ? 'rounded-[28px] p-[18px] shadow-[0_14px_30px_-18px_rgb(42_14_30/0.3)]' : 'rounded-[32px] p-6')}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`next-action-${variant}`} className="text-[0.6875rem] font-semibold tracking-[0.22em] text-muted-ink">
          PROCHAINE ACTION · 1 / {items.length}
        </h2>
        <span suppressHydrationWarning className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold', chip.className)}>
          <Clock className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          {chip.label}
        </span>
      </div>

      {result && !result.ok && (
        <p role="alert" className="rounded-2xl bg-[#FBE3EE] px-4 py-3 text-sm text-accent-ink">
          {result.message}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="rounded-2xl bg-[#E3F1E6] px-4 py-3 text-sm text-[#1F6B3A]">
          {result.message}
        </p>
      )}

      <Link href={item.customerId ? `/admin/clients/${item.customerId}` : `/admin/commandes/${item.orderId}`} className="flex items-center gap-3.5">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-section font-display text-[1.1875rem] text-deep">{initials(item.customerName)}</span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-display text-[1.375rem] leading-none">{item.customerName}</span>
          <span className="truncate text-[0.8125rem] text-muted-ink">
            {item.where ? `${item.where} · ` : ''}
            {item.customerOrders > 1 ? `${item.customerOrders}ᵉ commande` : 'première commande'}
          </span>
        </span>
      </Link>

      <Link href={`/admin/commandes/${item.orderId}`} className="flex items-center gap-3 rounded-[20px] bg-card p-3">
        <span className="grid size-[54px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-surface">
          {item.firstItem?.imageUrl ? (
            <Image src={item.firstItem.imageUrl} alt="" width={108} height={108} sizes="54px" className="size-full object-contain p-1 mix-blend-multiply" />
          ) : (
            <ImageOff className="size-4 text-muted-ink" strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{item.firstItem?.name ?? item.reference}</span>
          <span className="truncate text-xs text-muted-ink">
            {item.firstItem ? `Pointure ${item.firstItem.sizeEu} · ×${item.firstItem.quantity}` : 'Commande'}
            {item.otherItems ? ` · +${item.otherItems} paire${item.otherItems > 1 ? 's' : ''}` : ''}
          </span>
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="whitespace-nowrap text-base font-bold tabular-nums">{num(item.total)}</span>
          <span className="whitespace-nowrap text-[0.6875rem] text-muted-ink">{item.paymentMethod === 'WAVE' ? 'Wave' : 'à la livraison'}</span>
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-2.5">
        <a href={`tel:${item.customerPhone}`} aria-label={`Appeler ${item.customerName} au ${formatSenegalPhone(item.customerPhone)}`} className="flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold ring-1 ring-inset ring-[#D5CABE] hover:ring-ink">
          <Phone className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Appeler
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold ring-1 ring-inset ring-[#D5CABE] hover:ring-ink">
            <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden="true" />
            WhatsApp
          </a>
        )}
      </div>

      {item.kind === 'confirm' ? (
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-deep text-[0.9375rem] font-bold text-cream transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          {pending && <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Confirmer la commande
        </button>
      ) : (
        <Link href={`/admin/commandes/${item.orderId}`} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-deep text-[0.9375rem] font-bold text-cream transition-opacity hover:opacity-90">
          <Smartphone className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
          Vérifier le paiement
        </Link>
      )}

      {items.length > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" onClick={later} className="h-9 text-[0.8125rem] font-semibold text-muted-ink hover:text-ink">
            Plus tard →
          </button>
          <span aria-hidden="true" className="flex gap-1.5">
            {items.slice(0, 6).map((i, index) => (
              <span key={i.key} className={cn('h-1.5 rounded-full', index === 0 ? 'w-[18px] bg-deep' : 'w-1.5 bg-border')} />
            ))}
          </span>
        </div>
      )}
    </section>
  );
}
