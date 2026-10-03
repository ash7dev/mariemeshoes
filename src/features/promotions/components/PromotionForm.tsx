'use client';

import { startTransition, useActionState, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, BadgePercent, Banknote, LoaderCircle, Shuffle, Tag, Ticket, Trash2, Truck } from 'lucide-react';
import type { DiscountType, PromotionKind } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import { Field, Section, Toggle, describe, inputClass, inputState } from '@/features/catalog/components/form-ui';
import { createPromotionAction, deletePromotionAction, updatePromotionAction, type PromotionFormState } from '../actions';
import type { PromotionForEdit, PromotionFormOptions } from '../admin-queries';
import { describePromotion, exampleOnPair, promotionStatus } from '../describe';
import { normalizeCode } from '../rules';
import { PROMOTION_LIMITS, promotionInputSchema, type PromotionInput } from '../schemas';
import TargetPicker, { type Targets } from './TargetPicker';

type State = {
  kind: PromotionKind;
  name: string;
  description: string;
  code: string;
  discountType: DiscountType;
  value: string;
  maxDiscount: string;
  scope: 'ALL' | 'TARGETS';
  targets: Targets;
  minSubtotal: string;
  minPairs: string;
  firstOrderOnly: boolean;
  usageLimit: string;
  usageLimitPerCustomer: string;
  stackable: boolean;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

/** Date → valeur d'un input datetime-local, à l'heure de Dakar (UTC). */
const toLocal = (iso: string) => iso.slice(0, 16);
const str = (n: number | null) => (n === null ? '' : String(n));
const num = (s: string) => {
  const n = Number(s.replace(/\s/g, ''));
  return s.trim() && Number.isFinite(n) ? n : null;
};

function initialState(promotion?: PromotionForEdit): State {
  if (!promotion) {
    return {
      kind: 'CODE',
      name: '',
      description: '',
      code: '',
      discountType: 'PERCENTAGE',
      value: '',
      maxDiscount: '',
      scope: 'ALL',
      targets: { brandIds: [], categoryIds: [], collectionIds: [], colorwayIds: [] },
      minSubtotal: '',
      minPairs: '',
      firstOrderOnly: false,
      usageLimit: '',
      usageLimitPerCustomer: '1',
      stackable: false,
      isActive: true,
      startsAt: toLocal(new Date().toISOString()),
      endsAt: '',
    };
  }
  return {
    kind: promotion.kind,
    name: promotion.name,
    description: promotion.description,
    code: promotion.code,
    discountType: promotion.discountType,
    value: str(promotion.value),
    maxDiscount: str(promotion.maxDiscount),
    scope: promotion.scope,
    targets: promotion.targets,
    minSubtotal: str(promotion.minSubtotal),
    minPairs: str(promotion.minPairs),
    firstOrderOnly: promotion.firstOrderOnly,
    usageLimit: str(promotion.usageLimit),
    usageLimitPerCustomer: str(promotion.usageLimitPerCustomer),
    stackable: promotion.stackable,
    isActive: promotion.isActive,
    startsAt: toLocal(promotion.startsAt),
    endsAt: promotion.endsAt ? toLocal(promotion.endsAt) : '',
  };
}

/** Données envoyées : les champs sans objet pour ce type sont vidés (comme côté serveur). */
function stateToInput(s: State): PromotionInput {
  const isCode = s.kind === 'CODE';
  const freeDelivery = s.discountType === 'FREE_DELIVERY';
  return {
    kind: s.kind,
    name: s.name,
    description: s.description,
    code: isCode ? s.code : '',
    discountType: s.discountType,
    value: freeDelivery ? '' : s.value,
    maxDiscount: s.discountType === 'PERCENTAGE' ? s.maxDiscount : '',
    scope: s.scope,
    targets: s.scope === 'TARGETS' ? s.targets : { brandIds: [], categoryIds: [], collectionIds: [], colorwayIds: [] },
    minSubtotal: isCode || freeDelivery ? s.minSubtotal : '',
    minPairs: isCode ? s.minPairs : '',
    firstOrderOnly: isCode && s.firstOrderOnly,
    usageLimit: isCode ? s.usageLimit : '',
    usageLimitPerCustomer: isCode ? s.usageLimitPerCustomer : '',
    stackable: isCode && s.stackable,
    isActive: s.isActive,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
  };
}

/** Code lisible au téléphone : sans 0/O ni 1/I. */
function randomCode(name: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = normalizeCode(name).replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => alphabet[b % alphabet.length]).join('');
  return prefix.length >= 3 ? `${prefix}${suffix.slice(0, 2)}` : `MS${suffix}`;
}

type PromotionFormProps = {
  options: PromotionFormOptions;
  promotion?: PromotionForEdit;
  notice?: 'creee' | 'modifiee';
};

/** Formulaire promotion : création ET modification. */
export default function PromotionForm({ options, promotion, notice }: PromotionFormProps) {
  const editing = Boolean(promotion);
  const [state, setState] = useState<State>(() => initialState(promotion));
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [dirty, setDirty] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [actionState, formAction, pending] = useActionState<PromotionFormState, FormData>(
    editing ? updatePromotionAction : createPromotionAction,
    { status: 'idle' },
  );

  const errors: FieldErrors = clientErrors ?? (actionState.status === 'error' ? actionState.fieldErrors : {});
  const formError = clientErrors
    ? Object.keys(clientErrors).length > 0
      ? 'Certains champs sont à corriger.'
      : null
    : actionState.status === 'error'
      ? actionState.formError
      : null;

  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, pending]);

  const set = (patch: Partial<State>) => {
    setDirty(true);
    setState((s) => ({ ...s, ...patch }));
  };

  function submit() {
    const input = stateToInput(state);
    const parsed = promotionInputSchema.safeParse(input);
    if (!parsed.success) {
      setClientErrors(toFieldErrors(parsed.error));
      return;
    }
    setClientErrors(null);
    setDirty(false);
    const formData = new FormData();
    formData.set('payload', JSON.stringify(input));
    if (promotion) formData.set('meta', JSON.stringify({ promotionId: promotion.id, expectedUpdatedAt: promotion.updatedAt }));
    startTransition(() => formAction(formData));
  }

  const isCode = state.kind === 'CODE';
  const freeDelivery = state.discountType === 'FREE_DELIVERY';

  // Aperçu
  const labelOf = (list: { id: string; label: string }[], id: string) => list.find((o) => o.id === id)?.label ?? '…';
  const targetLabels =
    state.scope === 'ALL'
      ? []
      : [
          ...state.targets.brandIds.map((id) => labelOf(options.brands, id)),
          ...state.targets.categoryIds.map((id) => labelOf(options.categories, id)),
          ...state.targets.collectionIds.map((id) => labelOf(options.collections, id)),
          ...state.targets.colorwayIds.map((id) => labelOf(options.colorways, id)),
        ];
  const preview = describePromotion({
    kind: state.kind,
    discountType: state.discountType,
    value: num(state.value),
    maxDiscount: state.discountType === 'PERCENTAGE' ? num(state.maxDiscount) : null,
    targetLabels,
    minSubtotal: isCode || freeDelivery ? num(state.minSubtotal) : null,
    minPairs: isCode ? num(state.minPairs) : null,
    firstOrderOnly: isCode && state.firstOrderOnly,
    usageLimit: isCode ? num(state.usageLimit) : null,
    usageLimitPerCustomer: isCode ? num(state.usageLimitPerCustomer) : null,
    stackable: isCode && state.stackable,
  });
  const example = exampleOnPair({ discountType: state.discountType, value: num(state.value), maxDiscount: num(state.maxDiscount) });
  const status = state.startsAt
    ? promotionStatus({ isActive: state.isActive, startsAt: new Date(`${state.startsAt}:00Z`), endsAt: state.endsAt ? new Date(`${state.endsAt}:00Z`) : null })
    : null;

  const card = (selected: boolean) =>
    cn(
      'flex flex-1 items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
      selected ? 'border-deep bg-deep text-cream' : 'border-border bg-page hover:border-muted',
    );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-6xl flex-col gap-6 pb-32"
    >
      {/* En-tête */}
      <div className="flex flex-col gap-4">
        <Link href="/admin/promotions" className="flex h-10 items-center gap-2 self-start text-sm text-muted-ink hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Promotions
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[2rem] leading-tight lg:text-[2.5rem]">{editing ? state.name || 'Promotion sans nom' : 'Nouvelle promotion'}</h1>
          {editing && isCode && state.code && (
            <span className="rounded-full border border-dashed border-accent-ink px-3 py-1 font-mono text-sm font-semibold text-accent-ink">{normalizeCode(state.code)}</span>
          )}
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink">
          {notice === 'creee' ? 'Promotion créée.' : 'Modifications enregistrées.'}
        </p>
      )}
      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-[#FBE3EE] px-5 py-4 text-sm text-accent-ink">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Type */}
          <Section id="kind" title="Type de promotion">
            <div role="radiogroup" aria-label="Type de promotion" className="flex flex-col gap-3 sm:flex-row">
              <button type="button" role="radio" aria-checked={isCode} onClick={() => set({ kind: 'CODE' })} className={card(isCode)}>
                <Ticket className="mt-0.5 size-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">Code promo</span>
                  <span className={cn('text-[0.8125rem]', isCode ? 'text-deep-ink' : 'text-muted-ink')}>Le client saisit un code au panier : TABASKI10, BIENVENUE…</span>
                </span>
              </button>
              <button type="button" role="radio" aria-checked={!isCode} onClick={() => set({ kind: 'AUTOMATIC' })} className={card(!isCode)}>
                <Tag className="mt-0.5 size-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">Automatique</span>
                  <span className={cn('text-[0.8125rem]', !isCode ? 'text-deep-ink' : 'text-muted-ink')}>Appliquée d’office : prix barré en boutique, sans code.</span>
                </span>
              </button>
            </div>
            {errors.kind && <p className="text-sm text-accent-ink">{errors.kind}</p>}
          </Section>

          {/* Informations */}
          <Section id="info" title="Informations">
            <Field id="name" label="Nom" error={errors.name} hint="Pour toi, et affiché au client (« Spécial Tabaski »).">
              <input
                id="name"
                value={state.name}
                maxLength={PROMOTION_LIMITS.name}
                onChange={(event) => set({ name: event.target.value })}
                className={cn(inputClass, inputState(errors.name), 'h-12')}
                {...describe('name', errors.name, 'hint')}
              />
            </Field>
            {isCode && (
              <Field id="code" label="Code" error={errors.code} hint="Majuscules, chiffres, - et _ ; le client peut le taper en minuscules.">
                <div className="flex gap-2">
                  <input
                    id="code"
                    value={state.code}
                    maxLength={30}
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(event) => set({ code: event.target.value.toUpperCase().replace(/\s/g, '') })}
                    placeholder="TABASKI10"
                    className={cn(inputClass, inputState(errors.code), 'h-12 font-mono tracking-wider')}
                    {...describe('code', errors.code, 'hint')}
                  />
                  <button
                    type="button"
                    onClick={() => set({ code: randomCode(state.name) })}
                    className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium hover:border-ink"
                  >
                    <Shuffle className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    Générer
                  </button>
                </div>
              </Field>
            )}
            <Field id="description" label="Description" optional error={errors.description} hint="Note interne : pour qui, pourquoi (ex. « offert aux clientes Instagram »).">
              <textarea
                id="description"
                value={state.description}
                rows={2}
                maxLength={PROMOTION_LIMITS.description}
                onChange={(event) => set({ description: event.target.value })}
                className={cn(inputClass, inputState(errors.description), 'resize-y py-3')}
                {...describe('description', errors.description, 'hint')}
              />
            </Field>
          </Section>

          {/* Remise */}
          <Section id="discount" title="Remise">
            <div role="radiogroup" aria-label="Type de remise" className="flex flex-col gap-3 sm:flex-row">
              {(
                [
                  { type: 'PERCENTAGE', label: 'Pourcentage', hint: '-20 %', icon: BadgePercent },
                  { type: 'FIXED_AMOUNT', label: 'Montant fixe', hint: isCode ? '-5 000 FCFA sur la commande' : '-5 000 FCFA par paire', icon: Banknote },
                  { type: 'FREE_DELIVERY', label: 'Livraison offerte', hint: 'Frais de livraison à 0', icon: Truck },
                ] as const
              ).map(({ type, label, hint, icon: Icon }) => (
                <button key={type} type="button" role="radio" aria-checked={state.discountType === type} onClick={() => set({ discountType: type })} className={card(state.discountType === type)}>
                  <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{label}</span>
                    <span className={cn('text-[0.8125rem]', state.discountType === type ? 'text-deep-ink' : 'text-muted-ink')}>{hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {!freeDelivery && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="value" label={state.discountType === 'PERCENTAGE' ? 'Pourcentage' : 'Montant (FCFA)'} error={errors.value}>
                  <div className="relative">
                    <input
                      id="value"
                      inputMode="numeric"
                      value={state.value}
                      onChange={(event) => set({ value: event.target.value.replace(/[^\d\s]/g, '') })}
                      placeholder={state.discountType === 'PERCENTAGE' ? '20' : '5 000'}
                      className={cn(inputClass, inputState(errors.value), 'h-12 pr-16 tabular-nums')}
                      {...describe('value', errors.value)}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-ink">
                      {state.discountType === 'PERCENTAGE' ? '%' : 'FCFA'}
                    </span>
                  </div>
                </Field>
                {state.discountType === 'PERCENTAGE' && (
                  <Field id="maxDiscount" label="Plafond (FCFA)" optional error={errors.maxDiscount} hint="Remise maximale, ex. 10 000.">
                    <input
                      id="maxDiscount"
                      inputMode="numeric"
                      value={state.maxDiscount}
                      onChange={(event) => set({ maxDiscount: event.target.value.replace(/[^\d\s]/g, '') })}
                      className={cn(inputClass, inputState(errors.maxDiscount), 'h-12 tabular-nums')}
                      {...describe('maxDiscount', errors.maxDiscount, 'hint')}
                    />
                  </Field>
                )}
              </div>
            )}
          </Section>

          {/* Cible */}
          <Section id="scope" title="Sur quoi ?" description={freeDelivery ? 'La livraison est offerte si le panier contient au moins une paire ciblée.' : undefined}>
            <div role="radiogroup" aria-label="Cible" className="flex flex-col gap-3 sm:flex-row">
              <button type="button" role="radio" aria-checked={state.scope === 'ALL'} onClick={() => set({ scope: 'ALL' })} className={card(state.scope === 'ALL')}>
                <span className="font-semibold">Toute la boutique</span>
              </button>
              <button type="button" role="radio" aria-checked={state.scope === 'TARGETS'} onClick={() => set({ scope: 'TARGETS' })} className={card(state.scope === 'TARGETS')}>
                <span className="font-semibold">Une sélection</span>
              </button>
            </div>
            {state.scope === 'TARGETS' && <TargetPicker options={options} value={state.targets} onChange={(targets) => set({ targets })} error={errors.targets} />}
          </Section>

          {/* Conditions */}
          <Section
            id="conditions"
            title="Conditions"
            description={
              isCode
                ? 'Toutes facultatives. Le client est reconnu par son numéro de téléphone.'
                : freeDelivery
                  ? 'Une livraison offerte automatique peut exiger un minimum d’achat.'
                  : 'Une promotion automatique s’applique à tous, sans condition : pour des conditions, crée un code promo.'
            }
          >
            {(isCode || freeDelivery) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="minSubtotal" label="Minimum d’achat (FCFA)" optional error={errors.minSubtotal}>
                  <input
                    id="minSubtotal"
                    inputMode="numeric"
                    value={state.minSubtotal}
                    onChange={(event) => set({ minSubtotal: event.target.value.replace(/[^\d\s]/g, '') })}
                    placeholder="50 000"
                    className={cn(inputClass, inputState(errors.minSubtotal), 'h-12 tabular-nums')}
                    {...describe('minSubtotal', errors.minSubtotal)}
                  />
                </Field>
                {isCode && (
                  <Field id="minPairs" label="Minimum de paires" optional error={errors.minPairs}>
                    <input
                      id="minPairs"
                      inputMode="numeric"
                      value={state.minPairs}
                      onChange={(event) => set({ minPairs: event.target.value.replace(/\D/g, '') })}
                      placeholder="2"
                      className={cn(inputClass, inputState(errors.minPairs), 'h-12 tabular-nums')}
                      {...describe('minPairs', errors.minPairs)}
                    />
                  </Field>
                )}
              </div>
            )}
            {isCode && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="usageLimit" label="Utilisations au total" optional error={errors.usageLimit} hint="Vide : illimité. Ex. 50 premiers clients.">
                    <input
                      id="usageLimit"
                      inputMode="numeric"
                      value={state.usageLimit}
                      onChange={(event) => set({ usageLimit: event.target.value.replace(/\D/g, '') })}
                      className={cn(inputClass, inputState(errors.usageLimit), 'h-12 tabular-nums')}
                      {...describe('usageLimit', errors.usageLimit, 'hint')}
                    />
                  </Field>
                  <Field id="usageLimitPerCustomer" label="Utilisations par client" optional error={errors.usageLimitPerCustomer} hint="Vide : illimité.">
                    <input
                      id="usageLimitPerCustomer"
                      inputMode="numeric"
                      value={state.usageLimitPerCustomer}
                      onChange={(event) => set({ usageLimitPerCustomer: event.target.value.replace(/\D/g, '') })}
                      className={cn(inputClass, inputState(errors.usageLimitPerCustomer), 'h-12 tabular-nums')}
                      {...describe('usageLimitPerCustomer', errors.usageLimitPerCustomer, 'hint')}
                    />
                  </Field>
                </div>
                <div className="flex flex-col gap-4">
                  <Toggle
                    checked={state.firstOrderOnly}
                    onChange={(firstOrderOnly) => set({ firstOrderOnly })}
                    label="Première commande uniquement"
                    description="Réservé aux numéros qui n’ont jamais commandé."
                  />
                  {!freeDelivery && (
                    <Toggle
                      checked={state.stackable}
                      onChange={(stackable) => set({ stackable })}
                      label="Cumulable"
                      description="S’applique aussi aux paires déjà en prix barré ou en promotion automatique."
                    />
                  )}
                </div>
              </>
            )}
          </Section>

          {/* Période */}
          <Section id="period" title="Période" description="Heure de Dakar.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="startsAt" label="Début" error={errors.startsAt}>
                <input
                  id="startsAt"
                  type="datetime-local"
                  value={state.startsAt}
                  onChange={(event) => set({ startsAt: event.target.value })}
                  className={cn(inputClass, inputState(errors.startsAt), 'h-12')}
                  {...describe('startsAt', errors.startsAt)}
                />
              </Field>
              <Field id="endsAt" label="Fin" optional error={errors.endsAt} hint="Vide : sans date de fin.">
                <input
                  id="endsAt"
                  type="datetime-local"
                  value={state.endsAt}
                  onChange={(event) => set({ endsAt: event.target.value })}
                  className={cn(inputClass, inputState(errors.endsAt), 'h-12')}
                  {...describe('endsAt', errors.endsAt, 'hint')}
                />
              </Field>
            </div>
            <Toggle
              checked={state.isActive}
              onChange={(isActive) => set({ isActive })}
              label={state.isActive ? 'Activée' : 'Désactivée'}
              description="Désactiver arrête la promotion tout de suite, sans perdre son historique."
            />
          </Section>
        </div>

        {/* Aperçu */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-28">
          <section aria-labelledby="preview-title" className="flex flex-col gap-4 rounded-[28px] bg-deep p-6 text-cream">
            <div className="flex items-center justify-between gap-3">
              <h2 id="preview-title" className="text-[0.71875rem] font-semibold tracking-[0.22em] text-accent-soft">
                APERÇU
              </h2>
              {status && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    status.tone === 'live' ? 'bg-accent text-white' : status.tone === 'scheduled' ? 'bg-cream/15 text-cream' : 'bg-cream/10 text-deep-ink',
                  )}
                >
                  {status.label}
                </span>
              )}
            </div>
            {isCode && (
              <span className="self-start rounded-xl border border-dashed border-cream/40 px-3 py-1.5 font-mono text-lg font-semibold tracking-wider">
                {state.code ? normalizeCode(state.code) : 'CODE'}
              </span>
            )}
            <p className="font-display text-[1.625rem] leading-tight">{preview.headline}</p>
            {preview.details.length > 0 && (
              <ul className="flex flex-col gap-1.5 text-sm text-deep-ink">
                {preview.details.map((detail) => (
                  <li key={detail}>· {detail}</li>
                ))}
              </ul>
            )}
            {example && <p className="rounded-2xl bg-cream/10 px-4 py-3 text-sm">{example}</p>}
          </section>

          {editing && promotion && (
            <section className="flex flex-col gap-2 rounded-[28px] border border-border bg-surface p-5 text-sm">
              <h2 className="font-semibold">Utilisation</h2>
              {promotion.kind === 'CODE' ? (
                <p className="text-muted-ink">
                  <span className="font-display text-2xl text-ink">{promotion.usage.orders}</span> commande{promotion.usage.orders > 1 ? 's' : ''}
                  {promotion.usageLimit ? ` sur ${promotion.usageLimit} possibles` : ''}
                </p>
              ) : (
                <p className="text-muted-ink">
                  <span className="font-display text-2xl text-ink">{promotion.usage.pairs}</span> paire{promotion.usage.pairs > 1 ? 's' : ''} vendue
                  {promotion.usage.pairs > 1 ? 's' : ''} avec cette promotion
                </p>
              )}
              <p className="text-xs text-muted-ink">Les commandes annulées ne comptent pas.</p>
            </section>
          )}
        </aside>
      </div>

      {/* Barre d'actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2.5">
          {editing && promotion && (
            <div className="mr-auto flex flex-col">
              {promotion.deletable ? (
                <button
                  type="button"
                  disabled={deleting || pending}
                  onClick={() => {
                    if (!window.confirm(`Supprimer définitivement « ${promotion.name} » ?`)) return;
                    startDelete(async () => {
                      const result = await deletePromotionAction(promotion.id);
                      if (result && !result.ok) setDeleteError(result.error);
                    });
                  }}
                  className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-accent-ink hover:bg-[#FBE3EE] disabled:opacity-60"
                >
                  {deleting ? <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" /> : <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />}
                  Supprimer
                </button>
              ) : (
                <span className="hidden text-xs text-muted-ink sm:block">Déjà utilisée : désactive-la plutôt que de la supprimer.</span>
              )}
              {deleteError && <span className="text-xs text-accent-ink">{deleteError}</span>}
            </div>
          )}
          {!editing && <span className="mr-auto hidden text-sm text-muted-ink sm:block">{dirty ? 'Non enregistrée' : ''}</span>}
          <button
            type="submit"
            disabled={pending || deleting}
            className="flex h-12 items-center gap-2 rounded-full bg-deep px-6 text-sm font-semibold text-cream transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            {editing ? 'Enregistrer' : 'Créer la promotion'}
          </button>
        </div>
      </div>
    </form>
  );
}

