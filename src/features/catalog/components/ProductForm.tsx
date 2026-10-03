'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ExternalLink, LayoutGrid, LoaderCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { slugify } from '@/lib/slug';
import { createProductAction, updateProductAction, type ProductFormState } from '../actions';
import type { ProductForEdit } from '../queries';
import { GENDERS, GENDER_LABEL, PRODUCT_LIMITS, productInputSchema, toFieldErrors, type FieldErrors } from '../schemas';
import ColorwayEditor from './ColorwayEditor';
import { ChoiceChip, Field, Section, describe, inputClass, inputState } from './form-ui';
import { emptyProduct, newColorway, productToState, stateToInput, type ColorwayState, type ProductState } from './form-state';

type ProductFormProps = {
  options: { brands: string[]; categories: string[] };
  /** Absent : création. Présent : modification de ce produit. */
  product?: ProductForEdit;
  /** Bandeau de confirmation après enregistrement d'une modification. */
  notice?: 'modifie';
  /** Bloc indépendant du formulaire, affiché avant « Le modèle » (ex. coup de cœur). */
  extra?: React.ReactNode;
  /** Bloc indépendant affiché en bas, avant la barre d'actions (ex. suppression). */
  footer?: React.ReactNode;
};

/** Erreurs d'un coloris, chemins rendus relatifs (« colorways.2.price » → « price »). */
function colorwayErrors(errors: FieldErrors, index: number): FieldErrors {
  const prefix = `colorways.${index}.`;
  const result: FieldErrors = {};
  for (const [path, message] of Object.entries(errors)) if (path.startsWith(prefix)) result[path.slice(prefix.length)] = message;
  return result;
}

/**
 * Formulaire produit, création ET modification : le modèle (marque, catégorie, genre,
 * description, conseil taille) puis ses coloris (prix, photos, pointures et stock).
 * Validé dans le navigateur avec le même schéma que le serveur.
 */
export default function ProductForm({ options, product, notice, extra, footer }: ProductFormProps) {
  const editing = Boolean(product);
  const [state, setState] = useState<ProductState>(() => (product ? productToState(product) : emptyProduct()));
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [actionState, formAction, pending] = useActionState<ProductFormState, FormData>(
    editing ? updateProductAction : createProductAction,
    { status: 'idle' },
  );

  const serverErrors = actionState.status === 'error' ? actionState.fieldErrors : {};
  const errors: FieldErrors = clientErrors ?? serverErrors;
  const formError = clientErrors ? formNotice : actionState.status === 'error' ? actionState.formError : formNotice;

  // Quitter la page avec des modifications non enregistrées : le navigateur demande confirmation.
  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, pending]);

  const update = (patch: Partial<ProductState>) => {
    setDirty(true);
    setState((s) => ({ ...s, ...patch }));
  };
  const updateColorway = (key: string, change: (colorway: ColorwayState) => ColorwayState) => {
    setDirty(true);
    setState((s) => ({ ...s, colorways: s.colorways.map((c) => (c.key === key ? change(c) : c)) }));
  };
  const removeColorway = (key: string) => {
    const colorway = state.colorways.find((c) => c.key === key);
    if (colorway?.id && !window.confirm(`Retirer le coloris « ${colorway.name || 'sans nom'} » ? Il sera supprimé, ou masqué s’il a déjà été vendu.`)) return;
    update({ colorways: state.colorways.filter((c) => c.key !== key) });
  };

  function submit(intent: 'draft' | 'publish') {
    const uploading = state.colorways.some((c) => c.images.some((i) => i.status === 'preparing' || i.status === 'uploading'));
    if (uploading) {
      setClientErrors({});
      setFormNotice('Des photos sont encore en cours d’envoi : attends la fin avant d’enregistrer.');
      return;
    }
    const failed = state.colorways.some((c) => c.images.some((i) => i.status === 'error'));
    if (failed) {
      setClientErrors({});
      setFormNotice('Une photo n’a pas pu être envoyée : réessaie ou retire-la.');
      return;
    }

    const input = stateToInput(state, intent);
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) {
      setClientErrors(toFieldErrors(parsed.error));
      setFormNotice('Certains champs sont à corriger.');
      return;
    }

    setClientErrors(null);
    setFormNotice(null);
    setDirty(false);
    const formData = new FormData();
    formData.set('payload', JSON.stringify(input));
    if (product) formData.set('meta', JSON.stringify({ productId: product.id, expectedUpdatedAt: product.updatedAt }));
    startTransition(() => formAction(formData));
  }

  const brandOptions = 'product-brands';
  const categoryOptions = 'product-categories';
  const slugPreview = state.slug || (editing ? product!.slug : slugify(`${state.brandName} ${state.name}`));

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit('publish');
      }}
      className="mx-auto flex max-w-4xl flex-col gap-6 pb-32"
    >
      {/* En-tête */}
      <div className="flex flex-col gap-4">
        <Link href="/admin/produits" className="flex h-10 items-center gap-2 self-start text-sm text-muted-ink hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
          Produits
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[2rem] leading-tight lg:text-[2.5rem]">
              {editing ? state.name || 'Produit sans nom' : 'Nouveau produit'}
            </h1>
            <p className="text-[0.9375rem] text-muted-ink">
              {editing
                ? product!.isActive
                  ? 'En ligne dans la boutique.'
                  : 'Brouillon : invisible dans la boutique.'
                : 'Un modèle, puis ses coloris : chaque coloris a sa page, ses photos et ses pointures.'}
            </p>
          </div>
          {editing && product!.isActive && product!.colorways[0] && (
            <Link
              href={`/produits/${product!.colorways[0].slug}`}
              target="_blank"
              className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:border-ink"
            >
              <ExternalLink className="size-4" strokeWidth={1.7} aria-hidden="true" />
              Voir dans la boutique
            </Link>
          )}
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

      {extra}

      {/* Le modèle */}
      <Section id="model" title="Le modèle" description="Ce qui est commun à tous les coloris.">
        <Field id="name" label="Nom du modèle" error={errors.name} hint="Sans la marque ni le coloris, ex. Air Force 1 ’07">
          <input
            id="name"
            value={state.name}
            maxLength={PRODUCT_LIMITS.name}
            onChange={(event) => update({ name: event.target.value })}
            className={cn(inputClass, inputState(errors.name), 'h-12')}
            {...describe('name', errors.name, 'hint')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="brandName" label="Marque" error={errors.brandName} hint="Choisis-en une ou saisis une nouvelle marque.">
            <input
              id="brandName"
              list={brandOptions}
              value={state.brandName}
              maxLength={PRODUCT_LIMITS.brandName}
              onChange={(event) => update({ brandName: event.target.value })}
              autoComplete="off"
              className={cn(inputClass, inputState(errors.brandName), 'h-12')}
              {...describe('brandName', errors.brandName, 'hint')}
            />
            <datalist id={brandOptions}>
              {options.brands.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </Field>
          <Field id="categoryName" label="Catégorie" optional error={errors.categoryName} hint="Ex. Lifestyle, Basket, Running">
            <input
              id="categoryName"
              list={categoryOptions}
              value={state.categoryName}
              maxLength={PRODUCT_LIMITS.categoryName}
              onChange={(event) => update({ categoryName: event.target.value })}
              autoComplete="off"
              className={cn(inputClass, inputState(errors.categoryName), 'h-12')}
              {...describe('categoryName', errors.categoryName, 'hint')}
            />
            <datalist id={categoryOptions}>
              {options.categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span id="gender-label" className="text-sm font-medium">
            Genre
          </span>
          <div role="radiogroup" aria-labelledby="gender-label" className="flex flex-wrap gap-2">
            {GENDERS.map((gender) => (
              <ChoiceChip key={gender} selected={state.gender === gender} onClick={() => update({ gender })}>
                {GENDER_LABEL[gender]}
              </ChoiceChip>
            ))}
          </div>
          {errors.gender ? (
            <p className="text-sm text-accent-ink">{errors.gender}</p>
          ) : (
            <p className="text-[0.8125rem] text-muted-ink">Unisexe : le modèle apparaît dans Homme et dans Femme.</p>
          )}
        </div>
      </Section>

      {/* Description */}
      <Section id="description" title="Description et taille">
        <Field id="description-text" label="Description" optional error={errors.description}>
          <textarea
            id="description-text"
            value={state.description}
            maxLength={PRODUCT_LIMITS.description}
            rows={5}
            onChange={(event) => update({ description: event.target.value })}
            className={cn(inputClass, inputState(errors.description), 'resize-y py-3 leading-relaxed')}
            {...describe('description-text', errors.description)}
          />
        </Field>
        <Field
          id="sizeAdvice"
          label="Conseil taille"
          optional
          error={errors.sizeAdvice}
          hint="Affiché sur la fiche, ex. « Taille petit, prends une pointure au-dessus »."
        >
          <input
            id="sizeAdvice"
            value={state.sizeAdvice}
            maxLength={PRODUCT_LIMITS.sizeAdvice}
            onChange={(event) => update({ sizeAdvice: event.target.value })}
            className={cn(inputClass, inputState(errors.sizeAdvice), 'h-12')}
            {...describe('sizeAdvice', errors.sizeAdvice, 'hint')}
          />
        </Field>
      </Section>

      {/* Coloris */}
      <Section
        id="colorways"
        title="Coloris"
        description="Chaque coloris a sa propre page dans la boutique, avec ses photos, son prix et ses pointures."
      >
        <ShopPreview modelName={[state.brandName, state.name].filter(Boolean).join(' ')} colorways={state.colorways} />
        {errors.colorways && <p className="text-sm text-accent-ink">{errors.colorways}</p>}
        <div className="flex flex-col gap-4">
          {state.colorways.map((colorway, index) => (
            <ColorwayEditor
              key={colorway.key}
              index={index}
              colorway={colorway}
              onChange={(change) => updateColorway(colorway.key, change)}
              onRemove={state.colorways.length > 1 ? () => removeColorway(colorway.key) : undefined}
              errors={colorwayErrors(errors, index)}
              productName={[state.brandName, state.name].filter(Boolean).join(' ')}
            />
          ))}
        </div>
        {state.colorways.length < PRODUCT_LIMITS.maxColorways && (
          <button
            type="button"
            onClick={() => update({ colorways: [...state.colorways, newColorway()] })}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-muted text-sm font-semibold transition-colors hover:border-accent hover:text-accent-ink"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
            Ajouter un coloris
          </button>
        )}
      </Section>

      {/* Adresse */}
      <Section id="address" title="Adresse de la page" description="Générée automatiquement. Ne la change que si nécessaire : les anciens liens partagés ne marcheraient plus.">
        <Field id="slug" label="Adresse du modèle" optional error={errors.slug} hint={`mariemeshoes.sn/…/${slugPreview || 'adresse'}`}>
          <input
            id="slug"
            value={state.slug}
            onChange={(event) => update({ slug: event.target.value.toLowerCase() })}
            placeholder={slugPreview}
            className={cn(inputClass, inputState(errors.slug), 'h-12')}
            {...describe('slug', errors.slug, 'hint')}
          />
        </Field>
      </Section>

      {footer}

      {/* Barre d'actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2.5">
          <span className="mr-auto hidden text-sm text-muted-ink sm:block">
            {pending ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : editing ? 'À jour' : ''}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit('draft')}
            className="h-12 rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:border-ink disabled:opacity-60"
          >
            {editing && product!.isActive ? 'Passer en brouillon' : 'Enregistrer le brouillon'}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 items-center gap-2 rounded-full bg-deep px-6 text-sm font-semibold text-cream transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
            {editing && product!.isActive ? 'Enregistrer' : 'Publier'}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Rappel visible pendant la saisie : dans la boutique, chaque coloris est présenté à part
 * (sa carte, sa page). La liste se met à jour au fil des coloris ajoutés.
 */
function ShopPreview({ modelName, colorways }: { modelName: string; colorways: ColorwayState[] }) {
  const shown = colorways.filter((c) => c.isActive);
  const count = shown.length;
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-section p-4 text-section-ink sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent-ink">
          <LayoutGrid className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-[0.9375rem] font-semibold text-deep">Chaque coloris est présenté à part dans la boutique</p>
          <p className="text-sm leading-relaxed">
            1 coloris = 1 carte et 1 page produit, avec ses propres photos, son prix et ses pointures. Les autres coloris du modèle
            apparaissent en petites pastilles sur sa carte. Un coloris masqué (« hors vente ») n&apos;est pas affiché.
          </p>
        </div>
      </div>
      <div aria-live="polite" className="flex flex-col gap-2 rounded-2xl bg-surface/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
          {count === 0 ? 'Aucune carte en boutique pour l’instant' : `Ce produit donnera ${count} carte${count > 1 ? 's' : ''} en boutique`}
        </p>
        {count > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((c) => (
              <li key={c.key} className="flex h-8 items-center rounded-full bg-surface px-3 text-[0.8125rem] font-medium text-ink">
                {modelName || 'Modèle'} · {c.name.trim() || 'coloris sans nom'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
