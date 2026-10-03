'use client';

import { useState } from 'react';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADULT_SIZES, KID_SIZES } from '@/features/size/sizes';
import { PRODUCT_LIMITS, type FieldErrors } from '../schemas';
import { Field, Toggle, describe, inputClass, inputState } from './form-ui';
import ImageManager from './ImageManager';
import { newVariant, type ColorwayState, type VariantState } from './form-state';

type ColorwayEditorProps = {
  index: number;
  colorway: ColorwayState;
  onChange: (update: (colorway: ColorwayState) => ColorwayState) => void;
  onRemove?: () => void;
  /** Erreurs de ce coloris, chemins relatifs : "name", "variants.0.stock"… */
  errors: FieldErrors;
  /** Nom du modèle (exemples de description des photos). */
  productName: string;
};

/**
 * Un coloris = une page boutique : nom, prix, photos et pointures disponibles
 * (stock par pointure). Les pointures se cochent dans une grille Adulte / Enfant.
 */
export default function ColorwayEditor({ index, colorway, onChange, onRemove, errors, productName }: ColorwayEditorProps) {
  const [open, setOpen] = useState(true);
  const [kids, setKids] = useState(() => colorway.variants.some((v) => v.sizeEu < 36) && !colorway.variants.some((v) => v.sizeEu >= 36));
  const prefix = `cw-${colorway.key}`;
  const set = (patch: Partial<ColorwayState>) => onChange((c) => ({ ...c, ...patch }));
  const setVariant = (key: string, patch: Partial<VariantState>) =>
    onChange((c) => ({ ...c, variants: c.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));

  const bySize = new Map(colorway.variants.map((v) => [v.sizeEu, v]));
  const toggleSize = (size: number) =>
    onChange((c) => {
      const exists = c.variants.some((v) => v.sizeEu === size);
      const variants = exists ? c.variants.filter((v) => v.sizeEu !== size) : [...c.variants, newVariant(size)];
      return { ...c, variants: variants.sort((a, b) => a.sizeEu - b.sizeEu) };
    });

  const totalStock = colorway.variants.reduce((sum, v) => sum + (v.isActive ? Number(v.stock) || 0 : 0), 0);
  const hasErrors = Object.keys(errors).length > 0;
  const pairName = [productName, colorway.name].filter(Boolean).join(' ');
  const title = colorway.name || `Coloris ${index + 1}`;

  return (
    <article className={cn('rounded-[26px] border bg-page', hasErrors ? 'border-accent-ink/50' : 'border-border')}>
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3 p-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={`${prefix}-body`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-deep font-display text-cream">{index + 1}</span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-xl">{title}</span>
            <span className="text-xs text-muted-ink">
              {colorway.variants.length} pointure{colorway.variants.length > 1 ? 's' : ''} · {totalStock} paire{totalStock > 1 ? 's' : ''} en stock ·{' '}
              {colorway.images.length} photo{colorway.images.length > 1 ? 's' : ''}
            </span>
          </span>
          <ChevronDown className={cn('ml-auto size-5 shrink-0 transition-transform', open && 'rotate-180')} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Toggle checked={colorway.isActive} onChange={(isActive) => set({ isActive })} label={colorway.isActive ? 'En vente' : 'Masqué'} />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Retirer le coloris ${title}`}
            title="Retirer ce coloris"
            className="grid size-10 place-items-center rounded-full text-accent-ink transition-colors hover:bg-[#FBE3EE]"
          >
            <Trash2 className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div id={`${prefix}-body`} className="flex flex-col gap-7 border-t border-border p-4 sm:p-6">
          {/* Identité et prix */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${prefix}-name`} label="Nom du coloris" error={errors.name} hint="Ex. Triple White, Panda, Bred">
              <input
                id={`${prefix}-name`}
                value={colorway.name}
                maxLength={PRODUCT_LIMITS.colorwayName}
                onChange={(event) => set({ name: event.target.value })}
                className={cn(inputClass, inputState(errors.name), 'h-12')}
                {...describe(`${prefix}-name`, errors.name, 'hint')}
              />
            </Field>
            <Field id={`${prefix}-style`} label="Code style" optional error={errors.styleCode} hint="Référence fabricant, ex. CW2288-111. Sert aussi de base aux SKU.">
              <input
                id={`${prefix}-style`}
                value={colorway.styleCode}
                maxLength={PRODUCT_LIMITS.styleCode}
                onChange={(event) => set({ styleCode: event.target.value })}
                className={cn(inputClass, inputState(errors.styleCode), 'h-12 uppercase')}
                {...describe(`${prefix}-style`, errors.styleCode, 'hint')}
              />
            </Field>
            <Field id={`${prefix}-price`} label="Prix (FCFA)" error={errors.price}>
              <input
                id={`${prefix}-price`}
                inputMode="numeric"
                value={colorway.price}
                onChange={(event) => set({ price: event.target.value.replace(/[^\d\s]/g, '') })}
                placeholder="45 000"
                className={cn(inputClass, inputState(errors.price), 'h-12 tabular-nums')}
                {...describe(`${prefix}-price`, errors.price)}
              />
            </Field>
            <Field id={`${prefix}-compare`} label="Prix barré (FCFA)" optional error={errors.compareAtPrice} hint="Ancien prix affiché barré, pour une promotion.">
              <input
                id={`${prefix}-compare`}
                inputMode="numeric"
                value={colorway.compareAtPrice}
                onChange={(event) => set({ compareAtPrice: event.target.value.replace(/[^\d\s]/g, '') })}
                className={cn(inputClass, inputState(errors.compareAtPrice), 'h-12 tabular-nums')}
                {...describe(`${prefix}-compare`, errors.compareAtPrice, 'hint')}
              />
            </Field>
          </div>

          {/* Photos */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Photos</h3>
            <ImageManager
              idPrefix={prefix}
              images={colorway.images}
              onChange={(update) => onChange((c) => ({ ...c, images: update(c.images) }))}
              error={errors.images}
              pairName={pairName}
            />
          </div>

          {/* Pointures */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Pointures disponibles</h3>
              <div role="radiogroup" aria-label="Type de pointures" className="grid grid-cols-2 gap-1 rounded-full bg-card p-1">
                {[
                  { label: 'Adulte', value: false },
                  { label: 'Enfant', value: true },
                ].map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    role="radio"
                    aria-checked={kids === tab.value}
                    onClick={() => setKids(tab.value)}
                    className={cn('h-9 rounded-full px-4 text-sm font-semibold', kids === tab.value ? 'bg-surface shadow-sm' : 'text-muted-ink')}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div role="group" aria-label="Cocher les pointures disponibles" className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {(kids ? KID_SIZES : ADULT_SIZES).map((size) => {
                const variant = bySize.get(size);
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={Boolean(variant)}
                    onClick={() => toggleSize(size)}
                    className={cn(
                      'h-11 rounded-[14px] border text-[0.9375rem] font-semibold transition-colors',
                      variant
                        ? variant.isActive
                          ? 'border-accent bg-accent text-white'
                          : 'border-dashed border-accent-ink bg-[#FBE3EE] text-accent-ink'
                        : 'border-border bg-surface hover:border-ink',
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {errors.variants && <p className="text-sm text-accent-ink">{errors.variants}</p>}

            {colorway.variants.length > 0 && (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {colorway.variants.map((variant, v) => {
                  const stockError = errors[`variants.${v}.stock`];
                  const skuError = errors[`variants.${v}.sku`];
                  const stock = Number(variant.stock) || 0;
                  const id = `${prefix}-v-${variant.key}`;
                  return (
                    <li key={variant.key} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !variant.isActive && 'bg-card/60')}>
                      <span className="w-14 font-display text-2xl">{variant.sizeEu}</span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Retirer une paire en ${variant.sizeEu}`}
                          onClick={() => setVariant(variant.key, { stock: String(Math.max(0, stock - 1)) })}
                          className="grid size-10 place-items-center rounded-full bg-card hover:bg-border"
                        >
                          <Minus className="size-4" strokeWidth={2} aria-hidden="true" />
                        </button>
                        <label htmlFor={`${id}-stock`} className="sr-only">
                          Stock en {variant.sizeEu}
                        </label>
                        <input
                          id={`${id}-stock`}
                          inputMode="numeric"
                          value={variant.stock}
                          onChange={(event) => setVariant(variant.key, { stock: event.target.value.replace(/\D/g, '') })}
                          className={cn(inputClass, inputState(stockError), 'h-10 w-16 px-2 text-center tabular-nums')}
                          {...describe(`${id}-stock`, stockError)}
                        />
                        <button
                          type="button"
                          aria-label={`Ajouter une paire en ${variant.sizeEu}`}
                          onClick={() => setVariant(variant.key, { stock: String(Math.min(PRODUCT_LIMITS.maxStock, stock + 1)) })}
                          className="grid size-10 place-items-center rounded-full bg-card hover:bg-border"
                        >
                          <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                        </button>
                        <span className="ml-1 text-xs text-muted-ink">paire{stock > 1 ? 's' : ''}</span>
                      </div>

                      <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
                        <label htmlFor={`${id}-sku`} className="sr-only">
                          SKU de la pointure {variant.sizeEu}
                        </label>
                        <input
                          id={`${id}-sku`}
                          value={variant.sku}
                          maxLength={PRODUCT_LIMITS.sku}
                          onChange={(event) => setVariant(variant.key, { sku: event.target.value })}
                          placeholder="SKU (auto si vide)"
                          className={cn(inputClass, inputState(skuError), 'h-10 text-sm uppercase')}
                          {...describe(`${id}-sku`, skuError)}
                        />
                        {(stockError || skuError) && <p className="text-xs text-accent-ink">{stockError ?? skuError}</p>}
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={(event) => setVariant(variant.key, { isActive: event.target.checked })}
                          className="size-4 accent-[#E6007E]"
                        />
                        En vente
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
