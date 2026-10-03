'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowUpRight, Banknote, Check, ChevronDown, ImageOff, LoaderCircle, Plus, Smartphone, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import type { FieldErrors } from '@/features/catalog/schemas';
import { getCartViewAction } from '@/features/cart/actions';
import type { CartView } from '@/features/cart/pricing';
import { clearCart, useCart } from '@/features/cart/store';
import { placeOrderAction } from '../actions';

export type CheckoutZone = { id: string; name: string; fee: number; estimatedDelay: string | null };
type Payment = 'WAVE' | 'CASH_ON_DELIVERY';

const input =
  'h-[50px] w-full rounded-[14px] border bg-page px-3.5 text-base font-normal text-ink outline-none transition-colors placeholder:text-muted focus:border-ink lg:h-[52px] lg:rounded-2xl lg:px-4 lg:text-[0.9375rem]';

function Field({ id, label, optional, hint, error, children }: { id: string; label: string; optional?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 lg:gap-2">
      <label htmlFor={id} className="text-[0.84375rem] font-semibold lg:text-sm">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted-ink">(facultatif)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[0.8125rem] text-accent-ink">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-ink lg:text-[0.78125rem]">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function StepTitle({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 font-display text-2xl lg:gap-3.5 lg:text-[1.875rem]">
      <span className="grid size-8 place-items-center rounded-full bg-section font-sans text-sm font-bold text-section-ink lg:size-10 lg:text-base">{n}</span>
      {children}
    </h2>
  );
}

/**
 * La commande en une page : Toi · Livraison · Paiement, et le récapitulatif recalculé
 * par le serveur (zone choisie comprise). Si le client choisit Wave, il paie avec le
 * lien Wave Business puis valide. Le serveur revérifie tout à l'enregistrement.
 */
export default function CheckoutForm({ zones, wavePaymentLink }: { zones: CheckoutZone[]; wavePaymentLink: string | null }) {
  const router = useRouter();
  const cart = useCart();
  const formId = useId();
  const [view, setView] = useState<CartView | null>(null);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [payment, setPayment] = useState<Payment>('WAVE');
  const [showAlt, setShowAlt] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [fields, setFields] = useState({ customerName: '', customerPhone: '', customerPhoneAlt: '', city: '', address: '', landmark: '', note: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();
  const [done, setDone] = useState(false);

  const key = cart ? JSON.stringify(cart.lines) + (cart.code ?? '') + zoneId : '';
  useEffect(() => {
    if (!cart || cart.lines.length === 0 || done) return;
    let cancelled = false;
    getCartViewAction({ lines: cart.lines, code: cart.code, zoneId: zoneId || null }).then((result) => {
      if (cancelled) return;
      if (result.ok) setView(result.view);
      else setFormError(result.error);
    });
    return () => {
      cancelled = true;
    };
    // key résume le panier et la zone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (name: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [name]: event.target.value }));
  const describe = (id: string) => ({ 'aria-invalid': errors[id] ? true : undefined, 'aria-describedby': errors[id] ? `${id}-error` : undefined });

  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const blocked = !view || view.lines.some((l) => !l.available) || view.pairs === 0;

  const submit = () => {
    if (!cart || !view) return;
    setFormError(null);
    startPlacing(async () => {
      const result = await placeOrderAction({
        ...fields,
        customerPhoneAlt: showAlt ? fields.customerPhoneAlt : undefined,
        zoneId,
        paymentMethod: payment,
        code: cart.code ?? undefined,
        lines: cart.lines,
        expectedTotal: view.total,
      });
      if (result.ok) {
        setDone(true);
        clearCart();
        router.replace(`/commande/${result.orderId}`);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
      if (result.view) setView(result.view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // ── Panier vide ou en chargement ───────────────────────────────────────────
  if (!cart || done) {
    return <div role="status" aria-busy="true" className="mx-auto mt-8 h-96 max-w-[80rem] animate-pulse rounded-[32px] bg-card" />;
  }
  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-14 text-center">
        <h1 className="font-display text-[2rem] leading-tight">Ton panier est vide</h1>
        <p className="text-[0.9375rem] text-muted-ink">Ajoute une paire pour passer commande.</p>
        <Link href="/boutique" className="flex h-12 items-center rounded-full bg-deep px-6 text-sm font-semibold text-cream">
          Voir les paires
        </Link>
      </div>
    );
  }
  if (zones.length === 0) {
    return (
      <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-[32px] bg-card px-6 py-14 text-center">
        <h1 className="font-display text-[2rem] leading-tight">Les commandes ouvrent bientôt</h1>
        <p className="text-[0.9375rem] text-muted-ink">Aucune zone de livraison n’est encore ouverte. Écris-nous sur WhatsApp pour commander.</p>
      </div>
    );
  }

  const summaryLines = view?.lines.filter((l) => l.available) ?? [];

  return (
    <div className="mx-auto w-full max-w-[90rem] pb-32 lg:px-20 lg:pb-0">
      <div className="mx-auto w-full max-w-[80rem]">
        <header className="flex flex-col gap-2.5 px-4 pb-[18px] pt-2.5 lg:gap-0 lg:px-0 lg:pb-[30px] lg:pt-10">
          <ol aria-label="Étapes" className="flex items-center gap-2 text-xs font-semibold lg:gap-3 lg:text-[0.84375rem]">
            <li className="flex items-center gap-2 text-muted-ink">
              <span className="hidden size-[26px] place-items-center rounded-full bg-border text-ink lg:grid">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
              </span>
              <Link href="/panier" className="hover:text-ink">
                Panier
              </Link>
            </li>
            <li aria-hidden="true" className="h-px w-[18px] bg-[#D5CABE] lg:w-10" />
            <li aria-current="step" className="flex items-center gap-2 text-accent-ink lg:text-ink">
              <span className="hidden size-[26px] place-items-center rounded-full bg-deep text-xs text-cream lg:grid">2</span>
              Commande
            </li>
          </ol>
          <h1 className="font-display text-[2.5rem] leading-none lg:mt-[22px] lg:text-[4rem]">Ta commande</h1>
        </header>

        {formError && (
          <div role="alert" className="mx-3 mb-4 flex items-start gap-3 rounded-2xl bg-[#FBE3EE] px-4 py-3.5 text-sm leading-snug text-accent-ink lg:mx-0 lg:mb-6 lg:px-5 lg:py-4">
            <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span>
              {formError}{' '}
              {view?.lines.some((l) => !l.available) && (
                <Link href="/panier" className="font-semibold underline underline-offset-2">
                  Ouvrir le panier
                </Link>
              )}
            </span>
          </div>
        )}

        {/* Mobile : récapitulatif repliable */}
        <div className="mx-3 mb-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((o) => !o)}
            aria-expanded={summaryOpen}
            className="flex w-full items-center justify-between rounded-[22px] bg-deep px-[18px] py-3.5 text-cream"
          >
            <span className="flex flex-col items-start gap-0.5">
              <span className="text-xs text-deep-ink">
                {view?.pairs ?? 0} paire{(view?.pairs ?? 0) > 1 ? 's' : ''} · livraison {zone?.name}
              </span>
              <strong className="text-[1.0625rem] tabular-nums">{formatFCFA(view?.total ?? 0)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-[0.78125rem] font-semibold text-accent-soft">
              {summaryOpen ? 'Masquer' : 'Détail'}
              <ChevronDown className={cn('size-3.5 transition-transform', summaryOpen && 'rotate-180')} strokeWidth={2} aria-hidden="true" />
            </span>
          </button>
          {summaryOpen && view && <SummaryRows view={view} className="mt-1.5 rounded-[22px] bg-card px-[18px] py-4 text-[0.84375rem]" />}
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:gap-10">
          <form
            id={formId}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="flex flex-col gap-3 px-3 lg:gap-[18px] lg:px-0"
          >
            {/* 1. Toi */}
            <section aria-labelledby="step-1" className="flex flex-col gap-3.5 rounded-[26px] border border-border bg-surface px-[18px] py-5 lg:gap-5 lg:rounded-[32px] lg:p-[30px]">
              <StepTitle n={1} id="step-1">
                Toi
              </StepTitle>
              <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-4">
                <Field id="customerName" label="Nom et prénom" error={errors.customerName}>
                  <input id="customerName" value={fields.customerName} onChange={set('customerName')} autoComplete="name" placeholder="Ex. Aïssatou Diop" className={cn(input, errors.customerName ? 'border-accent-ink' : 'border-border')} {...describe('customerName')} />
                </Field>
                <Field id="customerPhone" label="Téléphone" hint="On t’appelle pour confirmer la commande." error={errors.customerPhone}>
                  <span className={cn('flex h-[50px] items-center rounded-[14px] border bg-page focus-within:border-ink lg:h-[52px] lg:rounded-2xl', errors.customerPhone ? 'border-accent-ink' : 'border-border')}>
                    <span className="flex h-full items-center border-r border-border px-3 text-[0.9375rem] font-semibold">+221</span>
                    <input
                      id="customerPhone"
                      value={fields.customerPhone}
                      onChange={set('customerPhone')}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="77 123 45 67"
                      className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted lg:text-[0.9375rem]"
                      {...describe('customerPhone')}
                    />
                  </span>
                </Field>
              </div>
              {showAlt ? (
                <div className="lg:max-w-[50%]">
                  <Field id="customerPhoneAlt" label="Deuxième numéro" optional hint="Un proche ou un autre opérateur, si on ne te joint pas." error={errors.customerPhoneAlt}>
                    <span className={cn('flex h-[50px] items-center rounded-[14px] border bg-page focus-within:border-ink lg:h-[52px] lg:rounded-2xl', errors.customerPhoneAlt ? 'border-accent-ink' : 'border-border')}>
                      <span className="flex h-full items-center border-r border-border px-3 text-[0.9375rem] font-semibold">+221</span>
                      <input
                        id="customerPhoneAlt"
                        value={fields.customerPhoneAlt}
                        onChange={set('customerPhoneAlt')}
                        inputMode="tel"
                        placeholder="76 000 00 00"
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted lg:text-[0.9375rem]"
                        {...describe('customerPhoneAlt')}
                      />
                    </span>
                  </Field>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAlt(true)} className="flex h-10 items-center gap-1.5 self-start text-[0.84375rem] font-semibold text-accent-ink lg:text-sm">
                  <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                  Ajouter un deuxième numéro (proche, autre opérateur)
                </button>
              )}
            </section>

            {/* 2. Livraison */}
            <section aria-labelledby="step-2" className="flex flex-col gap-3.5 rounded-[26px] border border-border bg-surface px-[18px] py-5 lg:gap-5 lg:rounded-[32px] lg:p-[30px]">
              <StepTitle n={2} id="step-2">
                Livraison
              </StepTitle>
              <Field id="zoneId" label="Zone de livraison" error={errors.zoneId}>
                <span className="relative block">
                  <select
                    id="zoneId"
                    value={zoneId}
                    onChange={(event) => setZoneId(event.target.value)}
                    className="h-[52px] w-full appearance-none rounded-[14px] border-[1.5px] border-ink bg-surface pl-3.5 pr-11 text-base font-medium outline-none lg:h-14 lg:rounded-2xl lg:pl-4 lg:text-[0.9375rem]"
                    {...describe('zoneId')}
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} · {formatFCFA(z.fee)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2" strokeWidth={2} aria-hidden="true" />
                </span>
              </Field>
              {zone && (
                <p className="-mt-1.5 flex items-center gap-2 text-[0.8125rem] font-medium text-[#1F6B3A]">
                  <Truck className="size-4" strokeWidth={1.8} aria-hidden="true" />
                  {zone.estimatedDelay ? `Livrée en ${zone.estimatedDelay}` : 'Délai confirmé par téléphone'} · {view?.delivery?.freeBy ? 'offerte' : formatFCFA(zone.fee)}
                </p>
              )}
              <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-4">
                <Field id="city" label="Quartier ou ville" error={errors.city}>
                  <input id="city" value={fields.city} onChange={set('city')} autoComplete="address-level2" placeholder="Ex. Mermoz, Thiès, Touba…" className={cn(input, errors.city ? 'border-accent-ink' : 'border-border')} {...describe('city')} />
                </Field>
                <Field id="landmark" label="Point de repère" optional error={errors.landmark}>
                  <input id="landmark" value={fields.landmark} onChange={set('landmark')} placeholder="Ex. en face de la pharmacie" className={cn(input, 'border-border')} />
                </Field>
              </div>
              <Field id="address" label="Adresse" hint="Rue, numéro, immeuble, étage : tout ce qui aide le livreur." error={errors.address}>
                <input id="address" value={fields.address} onChange={set('address')} autoComplete="street-address" placeholder="Ex. Rue 10, villa 24" className={cn(input, errors.address ? 'border-accent-ink' : 'border-border')} {...describe('address')} />
              </Field>
              <Field id="note" label="Un mot pour nous" optional error={errors.note}>
                <textarea id="note" rows={2} value={fields.note} onChange={set('note')} maxLength={500} placeholder="Ex. c’est un cadeau, appelez après 18 h…" className={cn(input, 'h-auto resize-y border-border py-3 leading-relaxed')} />
              </Field>
            </section>

            {/* 3. Paiement */}
            <section aria-labelledby="step-3" className="flex flex-col gap-3.5 rounded-[26px] border border-border bg-surface px-[18px] py-5 lg:gap-5 lg:rounded-[32px] lg:p-[30px]">
              <StepTitle n={3} id="step-3">
                Paiement
              </StepTitle>
              <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-2 lg:grid-cols-2 lg:gap-3">
                {(
                  [
                    { key: 'WAVE', title: 'Wave', text: 'Tu paies maintenant : ta commande part plus vite.', Icon: Smartphone },
                    { key: 'CASH_ON_DELIVERY', title: 'À la livraison', text: 'Tu paies le livreur en main propre, en espèces ou Wave.', Icon: Banknote },
                  ] as const
                ).map(({ key: method, title, text, Icon }) => {
                  const on = payment === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPayment(method)}
                      className={cn(
                        'flex items-start gap-3.5 rounded-[18px] px-4 py-3.5 text-left transition-colors lg:rounded-[22px] lg:p-5',
                        on ? 'bg-deep text-cream' : 'border border-border bg-page hover:border-ink',
                      )}
                    >
                      <span className={cn('hidden size-[46px] shrink-0 place-items-center rounded-full lg:grid', on ? 'bg-deep-line' : 'bg-card')}>
                        <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
                      </span>
                      <span className="flex flex-col gap-0.5 lg:gap-1">
                        <strong className="text-[0.9375rem] lg:text-base">{title}</strong>
                        <span className="text-[0.78125rem] leading-snug opacity-85 lg:text-[0.84375rem]">{text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {payment === 'WAVE' && (
                <div className="flex flex-col gap-3 rounded-[20px] bg-deep p-[18px] text-cream lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:rounded-[24px] lg:p-[22px]">
                  <span className="flex flex-col gap-1">
                    <span className="text-[0.65625rem] font-bold tracking-[0.22em] text-accent-soft lg:text-[0.6875rem]">WAVE BUSINESS</span>
                    <span className="text-[0.84375rem] text-deep-ink lg:text-[0.90625rem]">
                      {wavePaymentLink ? (
                        <>
                          Paie <strong className="text-cream">{formatFCFA(view?.total ?? 0)}</strong> puis valide ta commande.
                        </>
                      ) : (
                        <>Valide ta commande : on t’envoie le lien de paiement Wave par WhatsApp.</>
                      )}
                    </span>
                  </span>
                  {wavePaymentLink && (
                    <a
                      href={wavePaymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-full bg-cream px-[22px] text-[0.90625rem] font-bold text-deep lg:h-[52px]"
                    >
                      Payer avec Wave
                      <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden="true" />
                      <span className="sr-only">(nouvel onglet)</span>
                    </a>
                  )}
                </div>
              )}
            </section>
            <p className="mx-1.5 text-xs leading-normal text-muted-ink lg:hidden">Tes paires sont réservées dès la validation. En confirmant, tu acceptes les conditions de vente.</p>
          </form>

          {/* Récapitulatif (ordinateur) */}
          <aside aria-labelledby="summary-title" className="hidden flex-col gap-[18px] rounded-[36px] bg-deep p-[30px] text-cream lg:flex">
            <h2 id="summary-title" className="font-display text-[1.875rem]">
              {view?.pairs ?? 0} paire{(view?.pairs ?? 0) > 1 ? 's' : ''}
            </h2>
            <ul className="flex flex-col gap-3">
              {summaryLines.map((line) => (
                <li key={line.variantId} className="flex items-center gap-3.5">
                  <span className="relative grid size-[68px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-card">
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt="" fill sizes="68px" className="object-contain p-1 mix-blend-multiply" />
                    ) : (
                      <ImageOff className="size-4 text-muted-ink" strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="truncate text-[0.90625rem]">{line.model}</strong>
                    <span className="truncate text-[0.78125rem] text-deep-ink">
                      {line.colorway} · pointure {line.size}
                      {line.quantity > 1 ? ` · ×${line.quantity}` : ''}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-[0.90625rem] font-bold tabular-nums">{formatFCFA((line.unitPrice - line.unitDiscount) * line.quantity)}</span>
                </li>
              ))}
            </ul>
            {view && <SummaryRows view={view} dark className="flex flex-col gap-2.5 border-t border-deep-line pt-4 text-[0.90625rem]" />}
            <div className="flex items-baseline justify-between border-t border-deep-line pt-4">
              <span className="text-sm text-deep-ink">Total</span>
              <span className="font-display text-[2.75rem] leading-none tabular-nums">{formatFCFA(view?.total ?? 0)}</span>
            </div>
            <button
              type="submit"
              form={formId}
              disabled={placing || blocked}
              className="flex h-[62px] items-center justify-center gap-2.5 rounded-full bg-accent text-base font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_20px_36px_-14px_rgba(230,0,126,0.8)] disabled:opacity-60"
            >
              {placing && <LoaderCircle className="size-5 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
              Confirmer la commande
            </button>
            <p className="text-[0.78125rem] leading-relaxed text-deep-ink">
              Tes paires sont réservées dès la validation. En confirmant, tu acceptes les{' '}
              <Link href="/conditions-de-vente" className="underline">
                conditions de vente
              </Link>
              .
            </p>
          </aside>
        </div>
      </div>

      {/* Mobile : barre fixe */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-border bg-surface px-3 pb-[max(22px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_30px_-20px_rgba(42,14,30,0.35)] lg:hidden">
        <span className="flex flex-col pl-1.5">
          <span className="text-[0.6875rem] text-muted-ink">Total</span>
          <strong className="text-lg tabular-nums">{formatFCFA(view?.total ?? 0)}</strong>
        </span>
        <button
          type="submit"
          form={formId}
          disabled={placing || blocked}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-bold text-white disabled:opacity-60"
        >
          {placing && <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
          Confirmer la commande
        </button>
      </div>
    </div>
  );
}

/** Sous-total, code promo, livraison (ordinateur sur fond aubergine, mobile sur sable). */
function SummaryRows({ view, dark = false, className }: { view: CartView; dark?: boolean; className?: string }) {
  const muted = dark ? 'text-deep-ink' : 'text-muted-ink';
  const accent = dark ? 'text-accent-soft' : 'text-accent-ink';
  return (
    <dl className={cn('flex flex-col gap-2', className)}>
      <div className="flex justify-between gap-4">
        <dt className={muted}>Sous-total</dt>
        <dd className="tabular-nums">{formatFCFA(view.subtotal)}</dd>
      </div>
      {view.appliedCode && (
        <div className={cn('flex justify-between gap-4', accent)}>
          <dt>Code {view.appliedCode.code}</dt>
          <dd className="font-bold tabular-nums">−{formatFCFA(view.codeDiscount)}</dd>
        </div>
      )}
      {view.delivery && (
        <div className="flex justify-between gap-4">
          <dt className={muted}>Livraison {view.delivery.zoneName}</dt>
          <dd className="tabular-nums">{view.delivery.fee === 0 ? 'Offerte' : formatFCFA(view.delivery.fee)}</dd>
        </div>
      )}
    </dl>
  );
}
