'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ImageOff, LoaderCircle, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Smartphone, Tag, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { whatsappLink } from '@/lib/whatsapp';
import { getCartViewAction } from '../actions';
import type { CartView, CartViewLine } from '../pricing';
import { MAX_QUANTITY } from '../limits';
import { removeLine, restoreLine, setCartCode, setQuantity, useCart, type CartLine } from '../store';

/**
 * Le panier : les paires (pointure, quantité, alertes de stock) et le récapitulatif.
 * Aucune information de livraison ici : elle se choisit à la commande.
 * Les prix viennent toujours du serveur (getCartViewAction).
 */
export default function CartPage({ whatsappNumber }: { whatsappNumber: string | null }) {
  const cart = useCart();
  const [view, setView] = useState<CartView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ line: CartLine; index: number; name: string } | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const linesKey = cart ? JSON.stringify(cart.lines) + (cart.code ?? '') : '';

  // Recalcul serveur à chaque changement du panier.
  useEffect(() => {
    if (!cart) return;
    if (cart.lines.length === 0) {
      setView(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await getCartViewAction({ lines: cart.lines, code: cart.code });
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setView(result.view);
      // Le serveur fait foi : quantités ramenées au stock, pointures disparues retirées, code refusé oublié.
      const known = new Set(result.view.lines.map((l) => l.variantId));
      for (const line of cart.lines) if (!known.has(line.variantId)) removeLine(line.variantId);
      for (const l of result.view.lines) {
        const asked = cart.lines.find((c) => c.variantId === l.variantId)?.quantity;
        if (l.available && asked !== undefined && l.quantity < asked) setQuantity(l.variantId, l.quantity);
      }
      if (cart.code && result.view.codeError) setCartCode(null);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // linesKey résume le contenu du panier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  // Le message « retirée » disparaît tout seul.
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(timer);
  }, [removed]);

  const applyCode = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || !cart) return;
    setCodeError(null);
    startChecking(async () => {
      const result = await getCartViewAction({ lines: cart.lines, code });
      if (!result.ok) return setCodeError(result.error);
      if (result.view.codeError) return setCodeError(result.view.codeError);
      setCartCode(code);
      setCodeOpen(false);
      setCodeInput('');
    });
  };

  const remove = (line: CartViewLine) => {
    const qty = cart?.lines.find((l) => l.variantId === line.variantId)?.quantity ?? line.quantity;
    const index = removeLine(line.variantId);
    setRemoved({ line: { variantId: line.variantId, quantity: qty }, index, name: line.model });
  };

  // ── Chargement (hydratation ou premier calcul) ─────────────────────────────
  if (!cart || (cart.lines.length > 0 && !view && !error)) {
    return (
      <div role="status" aria-busy="true" className="mx-auto grid w-full max-w-[80rem] gap-6 px-3 pt-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-10 lg:px-0">
        <span className="sr-only">Chargement du panier…</span>
        <div className="h-72 animate-pulse rounded-[28px] bg-card lg:h-96 lg:rounded-[32px]" />
        <div className="h-80 animate-pulse rounded-[30px] bg-deep/85 lg:rounded-[36px]" />
      </div>
    );
  }

  // ── Panier vide ────────────────────────────────────────────────────────────
  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-3 pt-4 lg:pt-12">
        <section className="relative flex flex-col items-center gap-3.5 overflow-hidden rounded-[34px] bg-deep px-6 py-9 text-center text-cream lg:px-12 lg:py-14">
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-9 left-[-10px] font-display text-[8rem] leading-none text-[#33122A] lg:text-[11rem]">
            Vide
          </span>
          <span className="relative grid size-[200px] place-items-center rounded-full bg-section">
            <ShoppingBag className="size-16 text-section-ink" strokeWidth={1.2} aria-hidden="true" />
          </span>
          <h1 className="relative mt-2 font-display text-[2.125rem] leading-[1.05] lg:text-[2.75rem]">Ton panier attend sa première paire</h1>
          <p className="relative max-w-sm text-[0.90625rem] leading-relaxed text-deep-ink">Il ne reste plus qu’à choisir : on ne te montre que les paires disponibles dans ta pointure.</p>
          <div className="relative mt-2 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/boutique" className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-accent px-7 text-[0.9375rem] font-bold text-white">
              Voir les paires
              <ArrowRight className="size-[17px]" strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/marques" className="flex h-[54px] items-center justify-center rounded-full border border-[#6B3A52] px-7 text-sm font-semibold">
              Parcourir les marques
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const lines = view?.lines ?? [];
  const blocked = lines.some((l) => !l.available);
  const count = view?.pairs ?? 0;
  const waOrder = whatsappLink(
    whatsappNumber,
    ['Bonjour Mariemeshoes, je souhaite commander :', ...lines.filter((l) => l.available).map((l) => `• ${l.brand} ${l.model} ${l.colorway} · pointure ${l.size} × ${l.quantity}`)].join('\n'),
  );

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col pb-32 lg:px-20 lg:pb-0">
      <div className="mx-auto w-full max-w-[80rem]">
        <header className="flex items-baseline gap-2.5 px-4 pb-4 pt-3.5 lg:gap-[18px] lg:px-0 lg:pb-[30px] lg:pt-[52px]">
          <h1 className="font-display text-[2.5rem] leading-none lg:text-[4rem]">Ton panier</h1>
          <span className="text-sm text-muted-ink lg:text-base">
            {count} paire{count > 1 ? 's' : ''}
          </span>
        </header>

        {error && (
          <p role="alert" className="mx-3 mb-4 rounded-2xl bg-[#FBE3EE] px-4 py-3 text-sm text-accent-ink lg:mx-0">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:gap-10">
          {/* Paires */}
          <section aria-label="Paires du panier" className="flex flex-col gap-4 lg:gap-[18px]">
            <p className="mx-3 hidden items-center gap-2.5 rounded-[18px] bg-section px-[18px] py-3.5 text-sm text-section-ink lg:mx-0 lg:flex">
              <ShieldCheck className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Les paires sont réservées dès que tu passes la commande.
            </p>
            <ul className="mx-3 rounded-[28px] border border-border bg-surface px-4 py-1 lg:mx-0 lg:rounded-[32px] lg:px-[26px] lg:py-2">
              {lines.map((line) => (
                <CartItem key={line.variantId} line={line} onRemove={() => remove(line)} />
              ))}
            </ul>
            <Link href="/boutique" className="mx-4 flex h-11 items-center gap-2 self-start text-sm font-semibold lg:mx-0 lg:h-12 lg:text-[0.90625rem]">
              <ArrowLeft className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
              Continuer mes achats
            </Link>
          </section>

          {/* Récapitulatif */}
          <aside aria-labelledby="summary-title" className="mx-3 flex flex-col gap-4 rounded-[30px] bg-deep p-5 text-cream lg:mx-0 lg:gap-5 lg:rounded-[36px] lg:p-[30px] lg:shadow-[0_40px_70px_-40px_rgba(42,14,30,0.7)]">
            <div className="flex items-baseline justify-between">
              <h2 id="summary-title" className="font-display text-2xl lg:text-[1.875rem]">
                Récapitulatif
              </h2>
              <span className="text-[0.8125rem] text-deep-ink">
                {count} paire{count > 1 ? 's' : ''}
              </span>
            </div>

            {view && (
              <dl className="flex flex-col gap-2.5 text-sm lg:gap-3 lg:text-[0.9375rem]">
                <div className="flex justify-between gap-4">
                  <dt className="text-deep-ink">Sous-total</dt>
                  <dd className="tabular-nums">{formatFCFA(view.gross)}</dd>
                </div>
                {view.savings > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-ink">Tes économies</dt>
                    <dd className="font-bold tabular-nums text-accent-soft">−{formatFCFA(view.savings)}</dd>
                  </div>
                )}
                {view.appliedCode && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-deep-ink">
                      Code
                      <span className="flex h-[26px] items-center gap-1 rounded-full border border-dashed border-accent-soft pl-2.5 pr-1 text-xs font-bold tracking-[0.08em] text-accent-soft">
                        {view.appliedCode.code}
                        <button type="button" onClick={() => setCartCode(null)} aria-label={`Retirer le code ${view.appliedCode.code}`} className="grid size-[22px] place-items-center">
                          <X className="size-3" strokeWidth={2.4} aria-hidden="true" />
                        </button>
                      </span>
                    </dt>
                    <dd className="font-bold tabular-nums text-accent-soft">−{formatFCFA(view.codeDiscount)}</dd>
                  </div>
                )}
              </dl>
            )}

            {!view?.appliedCode &&
              (codeOpen ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyCode();
                  }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex gap-2">
                    <label className="flex h-12 flex-1 items-center rounded-full border border-[#6B3A52] bg-[#33122A] px-4">
                      <span className="sr-only">Code promo</span>
                      <input
                        autoFocus
                        value={codeInput}
                        onChange={(event) => setCodeInput(event.target.value)}
                        placeholder="Ton code"
                        maxLength={30}
                        autoCapitalize="characters"
                        aria-invalid={Boolean(codeError)}
                        aria-describedby={codeError ? 'code-error' : undefined}
                        className="w-full bg-transparent text-[0.9375rem] uppercase tracking-[0.08em] text-cream outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-deep-ink"
                      />
                    </label>
                    <button type="submit" disabled={checking || !codeInput.trim()} className="flex h-12 items-center gap-2 rounded-full bg-cream px-[18px] text-sm font-semibold text-deep disabled:opacity-60">
                      {checking && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
                      Appliquer
                    </button>
                  </div>
                  {codeError && (
                    <p id="code-error" role="alert" className="text-[0.8125rem] text-accent-soft">
                      {codeError}
                    </p>
                  )}
                </form>
              ) : (
                <button type="button" onClick={() => setCodeOpen(true)} aria-expanded={false} className="flex h-10 items-center gap-2 self-start text-sm font-semibold text-accent-soft">
                  <Tag className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
                  Tu as un code promo ?
                </button>
              ))}

            <div className="flex items-baseline justify-between border-t border-deep-line pt-4 lg:pt-[18px]">
              <span className="text-sm text-deep-ink">Total</span>
              <span className="font-display text-[2.25rem] leading-none tabular-nums lg:text-[2.875rem]">
                {formatFCFA(view?.total ?? 0)}
              </span>
            </div>

            {blocked && <p className="text-[0.8125rem] text-accent-soft">Retire les paires indisponibles pour passer commande.</p>}

            <Link
              href="/commande"
              aria-disabled={blocked || count === 0}
              className={cn(
                'hidden h-[60px] items-center justify-center gap-2.5 rounded-full bg-accent text-base font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.25),0_20px_36px_-14px_rgba(230,0,126,0.8)] lg:flex',
                (blocked || count === 0) && 'pointer-events-none opacity-50',
              )}
            >
              Passer commande
              <ArrowRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            </Link>
            {waOrder && count > 0 && (
              <a
                href={waOrder}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#6B3A52] text-sm font-semibold lg:h-[52px] lg:text-[0.90625rem]"
              >
                <MessageCircle className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
                Commander sur WhatsApp
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            )}

            <ul className="hidden flex-col gap-3 border-t border-deep-line pt-[18px] text-[0.84375rem] text-deep-ink lg:flex">
              <li className="flex items-center gap-2.5">
                <Smartphone className="size-5 text-accent-soft" strokeWidth={1.6} aria-hidden="true" />
                Wave ou paiement à la livraison
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-accent-soft" strokeWidth={1.6} aria-hidden="true" />
                Aucun compte à créer · confirmation par téléphone
              </li>
            </ul>
          </aside>
        </div>
      </div>

      {/* Mobile : barre fixe */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-border bg-surface px-3 pb-[max(22px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_30px_-20px_rgba(42,14,30,0.35)] lg:hidden">
        <span className="flex flex-col pl-1.5">
          <span className="text-[0.6875rem] text-muted-ink">
            Total · {count} paire{count > 1 ? 's' : ''}
          </span>
          <strong className="text-lg tabular-nums">{formatFCFA(view?.total ?? 0)}</strong>
        </span>
        <Link
          href="/commande"
          aria-disabled={blocked || count === 0}
          className={cn(
            'flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-bold text-white',
            (blocked || count === 0) && 'pointer-events-none opacity-50',
          )}
        >
          Commander
          <ArrowRight className="size-[17px]" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {removed && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[104px] z-50 flex items-center justify-between gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-[0.8125rem] text-cream shadow-lg lg:inset-x-auto lg:bottom-7 lg:left-1/2 lg:-translate-x-1/2 lg:gap-4 lg:pl-5 lg:text-sm"
        >
          <span className="min-w-0 truncate">« {removed.name} » retirée du panier</span>
          <button
            type="button"
            onClick={() => {
              restoreLine(removed.line, removed.index);
              setRemoved(null);
            }}
            className="h-10 shrink-0 rounded-full bg-cream px-4 text-[0.8125rem] font-bold text-ink"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function CartItem({ line, onRemove }: { line: CartViewLine; onRemove: () => void }) {
  const unitPaid = line.unitPrice - line.unitDiscount;
  const struck = line.unitDiscount > 0 ? line.unitPrice : line.compareAtPrice;
  const max = Math.min(line.stock, MAX_QUANTITY);
  return (
    <li className={cn('flex gap-3.5 border-b border-border py-4 last:border-b-0 lg:gap-[22px] lg:py-[22px]', !line.available && 'opacity-80')}>
      <Link href={line.href} aria-label={`${line.brand} ${line.model}`} className="relative size-24 shrink-0 overflow-hidden rounded-[20px] bg-card lg:size-[150px] lg:rounded-[24px]">
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt="" fill sizes="150px" className="object-contain p-1.5 mix-blend-multiply" />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <ImageOff className="size-5" strokeWidth={1.4} aria-hidden="true" />
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-2">
        <div className="flex justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-muted-ink lg:text-[0.6875rem] lg:tracking-[0.2em]">{line.brand}</span>
            <Link href={line.href} className="truncate font-display text-[1.1875rem] leading-[1.1] hover:text-accent-ink lg:text-[1.625rem] lg:leading-[1.05]">
              {line.model}
            </Link>
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-ink lg:gap-2 lg:text-[0.84375rem]">
              {line.colorway}
              <span className="flex h-[22px] items-center rounded-full bg-accent px-2 text-[0.6875rem] font-bold text-white lg:h-[26px] lg:px-2.5 lg:text-xs">Pointure {line.size}</span>
            </span>
          </div>
          <button type="button" onClick={onRemove} aria-label={`Retirer ${line.model} du panier`} className="-mr-2.5 -mt-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-ink hover:bg-card hover:text-ink lg:size-11">
            <X className="size-[17px]" strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
        {line.promotion && line.unitDiscount > 0 && (
          <span className="flex h-6 items-center self-start rounded-full bg-section px-2.5 text-[0.71875rem] font-semibold text-section-ink">{line.promotion.name}</span>
        )}
        {line.notice && (
          <span className={cn('flex items-center gap-1.5 text-[0.71875rem] font-semibold lg:text-[0.78125rem]', line.available ? 'text-accent-ink' : 'text-accent-ink')}>
            <TriangleAlert className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {line.notice}
          </span>
        )}
        <div className="mt-auto flex items-end justify-between gap-2">
          {line.available ? (
            <div role="group" aria-label={`Quantité de ${line.model}`} className="flex items-center rounded-full border border-border bg-page p-0.5 lg:p-1">
              <button
                type="button"
                aria-label="Retirer une paire"
                disabled={line.quantity <= 1}
                onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                className="grid size-[34px] place-items-center rounded-full disabled:opacity-30 lg:size-[38px]"
              >
                <Minus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
              </button>
              <span aria-live="polite" className="w-6 text-center text-sm font-bold tabular-nums lg:w-7 lg:text-[0.9375rem]">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label="Ajouter une paire"
                disabled={line.quantity >= max}
                onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                className="grid size-[34px] place-items-center rounded-full disabled:opacity-30 lg:size-[38px]"
              >
                <Plus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span className="text-[0.8125rem] font-medium text-accent-ink">Indisponible</span>
          )}
          <span className="flex flex-col items-end">
            {struck && line.available && <span className="text-[0.71875rem] text-muted-ink line-through lg:text-[0.8125rem]">{formatFCFA(struck * line.quantity)}</span>}
            <strong className={cn('text-[0.9375rem] tabular-nums lg:text-[1.1875rem]', struck ? 'text-accent-ink' : 'text-ink')}>{formatFCFA(unitPaid * line.quantity)}</strong>
          </span>
        </div>
      </div>
    </li>
  );
}
