'use client';

import { startTransition, useActionState, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, LoaderCircle, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { slugify } from '@/lib/slug';
import DatePicker from '@/components/ui/DatePicker';
import { formatFCFA } from '@/lib/money';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import { ChoiceChip, Field, Section, Toggle, describe, inputClass, inputState } from '@/features/catalog/components/form-ui';
import {
  createCollectionAction,
  deleteCollectionAction,
  refreshBestsellersAction,
  updateCollectionAction,
  type CollectionFormState,
} from '../actions';
import type { CollectionForEdit, CollectionPair } from '../queries';
import { BESTSELLER_DAYS, BESTSELLER_LIMIT, COLLECTION_LIMITS, collectionInputSchema, type CollectionInput, type CollectionTypeValue } from '../schemas';
import PairPicker, { HiddenBadge, PairThumb } from './PairPicker';

type FormValues = {
  name: string;
  slug: string;
  description: string;
  type: CollectionTypeValue;
  isActive: boolean;
  showOnHome: boolean;
  startsOn: string;
  endsOn: string;
  colorwayIds: string[];
  notes: Record<string, string>;
};

function initialValues(collection?: CollectionForEdit): FormValues {
  if (!collection) {
    return { name: '', slug: '', description: '', type: 'MANUAL', isActive: true, showOnHome: false, startsOn: '', endsOn: '', colorwayIds: [], notes: {} };
  }
  return {
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    type: collection.type,
    isActive: collection.isActive,
    showOnHome: collection.showOnHome,
    startsOn: collection.startsOn,
    endsOn: collection.endsOn,
    colorwayIds: collection.pairs.map((p) => p.colorwayId),
    notes: collection.notes,
  };
}

/**
 * Formulaire collection, création ET modification : nom et description, les paires
 * (choisies à la main, ou meilleures ventes calculées), puis la visibilité
 * (active, page d'accueil, période).
 */
export default function CollectionForm({
  collection,
  options,
  notice,
}: {
  collection?: CollectionForEdit;
  options: CollectionPair[];
  notice?: 'modifiee';
}) {
  const editing = Boolean(collection);
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => initialValues(collection));
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [dirty, setDirty] = useState(false);
  const [actionState, formAction, pending] = useActionState<CollectionFormState, FormData>(
    editing ? updateCollectionAction : createCollectionAction,
    { status: 'idle' },
  );
  const [busy, startBusy] = useTransition();
  const [sideMessage, setSideMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const serverErrors = actionState.status === 'error' ? actionState.fieldErrors : {};
  const errors = clientErrors ?? serverErrors;
  const formError = clientErrors ? 'Certains champs sont à corriger.' : actionState.status === 'error' ? actionState.formError : null;

  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, pending]);

  const update = (patch: Partial<FormValues>) => {
    setDirty(true);
    setValues((v) => ({ ...v, ...patch }));
  };

  function submit() {
    const input: CollectionInput = { ...values };
    const parsed = collectionInputSchema.safeParse(input);
    if (!parsed.success) {
      setClientErrors(toFieldErrors(parsed.error));
      return;
    }
    setClientErrors(null);
    setDirty(false);
    const formData = new FormData();
    formData.set('payload', JSON.stringify(input));
    if (collection) formData.set('meta', JSON.stringify({ collectionId: collection.id, expectedUpdatedAt: collection.updatedAt }));
    startTransition(() => formAction(formData));
  }

  const recompute = () =>
    startBusy(async () => {
      const result = await refreshBestsellersAction(collection!.id);
      setSideMessage(result.ok ? { ok: true, text: 'Meilleures ventes recalculées.' } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });

  const remove = () => {
    const promos = collection!.promotions.length;
    const warning = promos > 0 ? `\n\nAttention : ${promos} promotion${promos > 1 ? 's la visent' : ' la vise'} et ne s’appliquera${promos > 1 ? 'ont' : ''} plus à ces paires.` : '';
    if (!window.confirm(`Supprimer la collection « ${collection!.name} » ? Les paires restent dans le catalogue.${warning}`)) return;
    startBusy(async () => {
      const result = await deleteCollectionAction(collection!.id);
      if (result && !result.ok) setSideMessage({ ok: false, text: result.error });
    });
  };

  const slugPreview = values.slug || (editing ? collection!.slug : slugify(values.name)) || 'nom-de-la-collection';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-4xl flex-col gap-6 pb-32"
    >
      <div className="flex flex-col gap-4">
        <Link href="/admin/collections" className="flex h-10 items-center gap-2 self-start text-sm text-muted-ink hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Collections
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[2rem] leading-tight lg:text-[2.5rem]">{editing ? values.name || 'Collection sans nom' : 'Nouvelle collection'}</h1>
          <p className="text-[0.9375rem] text-muted-ink">
            Une sélection de paires mise en avant dans la boutique : filtre « Collections », tuile dans la grille, page d’accueil.
          </p>
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink">
          Modifications enregistrées.
        </p>
      )}
      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-[#FBE3EE] px-5 py-4 text-sm leading-snug text-accent-ink">
          <AlertCircle className="mt-px size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </div>
      )}
      {sideMessage && (
        <p role={sideMessage.ok ? 'status' : 'alert'} className={sideMessage.ok ? 'rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink' : 'rounded-2xl bg-[#FBE3EE] px-5 py-4 text-sm text-accent-ink'}>
          {sideMessage.text}
        </p>
      )}

      {/* La collection */}
      <Section id="identity" title="La collection" description="Ce que voit le client.">
        <Field id="name" label="Nom" error={errors.name} hint="Ex. Spécial Tabaski, Moins de 50 000 FCFA, Tendances">
          <input
            id="name"
            value={values.name}
            maxLength={COLLECTION_LIMITS.name}
            onChange={(event) => update({ name: event.target.value })}
            className={inputClass + ' ' + inputState(errors.name) + ' h-12'}
            {...describe('name', errors.name, 'hint')}
          />
        </Field>
        <Field id="description" label="Description (facultatif)" error={errors.description} hint="Une phrase, affichée sur la tuile de la collection.">
          <textarea
            id="description"
            rows={3}
            value={values.description}
            maxLength={COLLECTION_LIMITS.description}
            onChange={(event) => update({ description: event.target.value })}
            className={inputClass + ' ' + inputState(errors.description) + ' py-3'}
            {...describe('description', errors.description, 'hint')}
          />
        </Field>
        <Field id="slug" label="Adresse" error={errors.slug} hint={`Lien : /collections/${slugPreview}. Générée depuis le nom si vide. À ne plus changer une fois partagée.`}>
          <input
            id="slug"
            value={values.slug}
            placeholder={slugPreview}
            onChange={(event) => update({ slug: event.target.value.toLowerCase() })}
            className={inputClass + ' ' + inputState(errors.slug) + ' h-12'}
            {...describe('slug', errors.slug, 'hint')}
          />
        </Field>
      </Section>

      {/* Paires */}
      <Section id="pairs" title="Les paires" description="Choisies à la main, ou calculées à partir des ventes.">
        <div role="radiogroup" aria-label="Type de collection" className="flex flex-wrap gap-2">
          <ChoiceChip selected={values.type === 'MANUAL'} onClick={() => update({ type: 'MANUAL' })}>
            Je choisis les paires
          </ChoiceChip>
          <ChoiceChip selected={values.type === 'AUTO_BESTSELLERS'} onClick={() => update({ type: 'AUTO_BESTSELLERS' })}>
            <Sparkles className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Meilleures ventes (automatique)
          </ChoiceChip>
        </div>

        {values.type === 'MANUAL' ? (
          <PairPicker
            options={options}
            value={values.colorwayIds}
            onChange={(colorwayIds) => update({ colorwayIds })}
            notes={values.notes}
            onNotesChange={(notes) => update({ notes })}
            max={COLLECTION_LIMITS.maxItems}
            error={errors.colorwayIds}
          />
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
            <p className="text-sm leading-relaxed">
              Les <strong>{BESTSELLER_LIMIT} paires les plus vendues</strong> sur les {BESTSELLER_DAYS} derniers jours (commandes confirmées, en préparation,
              expédiées ou livrées). La liste se met à jour toute seule ; une paire en rupture ou hors ligne n’est pas montrée aux clients.
            </p>
            {editing && collection!.type === 'AUTO_BESTSELLERS' && (
              <>
                {collection!.pairs.length === 0 ? (
                  <p className="text-sm text-muted-ink">Pas encore de ventes sur la période : la collection reste invisible en boutique.</p>
                ) : (
                  <ol className="flex flex-col gap-1.5">
                    {collection!.pairs.map((pair, index) => (
                      <li key={pair.colorwayId} className="flex items-center gap-3 rounded-xl bg-surface p-2">
                        <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-ink">{index + 1}</span>
                        <PairThumb pair={pair} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm">{pair.label}</span>
                        <HiddenBadge reason={pair.hiddenReason} />
                        <span className="text-xs text-muted-ink">{formatFCFA(pair.price)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  onClick={recompute}
                  disabled={busy}
                  className="flex h-10 items-center gap-2 self-start rounded-full border border-border bg-surface px-4 text-sm font-semibold hover:border-ink disabled:opacity-60"
                >
                  <RefreshCw className={busy ? 'size-4 motion-safe:animate-spin' : 'size-4'} strokeWidth={1.8} aria-hidden="true" />
                  Recalculer maintenant
                </button>
              </>
            )}
          </div>
        )}
      </Section>

      {/* Visibilité */}
      <Section id="visibility" title="Visibilité" description="Où et quand la collection apparaît.">
        <div className="flex flex-col gap-4">
          <Toggle
            checked={values.isActive}
            onChange={(isActive) => update({ isActive })}
            label="Active"
            description="Désactivée : invisible partout, mais rien n’est perdu."
          />
          <Toggle
            checked={values.showOnHome}
            onChange={(showOnHome) => update({ showOnHome })}
            label="Mettre en avant"
            description="Page d’accueil et tuile de la boutique. L’ordre se règle dans la liste des collections."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="startsOn" label="Du (facultatif)" error={errors.startsOn} hint="Vide : dès maintenant.">
            <DatePicker
              id="startsOn"
              value={values.startsOn}
              // Un début après la fin efface la fin : on la rechoisit dans le calendrier suivant.
              onChange={(startsOn) => update({ startsOn, ...(startsOn && values.endsOn && values.endsOn < startsOn ? { endsOn: '' } : {}) })}
              placeholder="Dès maintenant"
              rangeStart={values.startsOn}
              rangeEnd={values.endsOn}
              invalid={Boolean(errors.startsOn)}
              describedBy={describe('startsOn', errors.startsOn, 'hint')['aria-describedby']}
            />
          </Field>
          <Field id="endsOn" label="Au (facultatif, inclus)" error={errors.endsOn} hint="Vide : sans fin. Ex. la veille de Tabaski.">
            <DatePicker
              id="endsOn"
              value={values.endsOn}
              onChange={(endsOn) => update({ endsOn })}
              min={values.startsOn || undefined}
              placeholder="Sans fin"
              rangeStart={values.startsOn}
              rangeEnd={values.endsOn}
              invalid={Boolean(errors.endsOn)}
              describedBy={describe('endsOn', errors.endsOn, 'hint')['aria-describedby']}
            />
          </Field>
        </div>
        <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-ink">
          Une collection ne change pas les prix. Pour une remise sur ces paires,{' '}
          <Link href="/admin/promotions/nouvelle" className="font-semibold text-accent-ink hover:underline">
            crée une promotion
          </Link>{' '}
          qui vise cette collection.
          {editing && collection!.promotions.length > 0 && (
            <span className="mt-1 block text-ink">
              Visée par : {collection!.promotions.map((p) => p.name).join(', ')}.
            </span>
          )}
        </p>
      </Section>

      {editing && (
        <section aria-labelledby="delete-collection-title" className="flex flex-col gap-4 rounded-[28px] border border-[#F2C6DA] bg-[#FDF3F7] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex flex-col gap-1.5">
            <h2 id="delete-collection-title" className="font-display text-[1.375rem] leading-tight">
              Supprimer la collection
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-ink">Les paires restent dans le catalogue ; elles sortent seulement de cette sélection.</p>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent-ink px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Supprimer
          </button>
        </section>
      )}

      {/* Barre d'actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2.5">
          <span className="mr-auto hidden text-sm text-muted-ink sm:block">
            {pending ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : editing ? 'À jour' : ''}
          </span>
          <Link href="/admin/collections" className="flex h-12 items-center rounded-full border border-border px-5 text-sm font-semibold hover:border-ink">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 items-center gap-2 rounded-full bg-deep px-6 text-sm font-semibold text-cream transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            {editing ? 'Enregistrer' : 'Créer la collection'}
          </button>
        </div>
      </div>
    </form>
  );
}
