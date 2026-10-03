'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, ImageOff, PackageOpen, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { formatRelative } from '@/lib/dates';
import { GENDER_LABEL } from '../../schemas';
import type { AdminProductRow } from '../../list-queries';
import ProductRowActions from './ProductRowActions';
import StockAdjuster from './StockAdjuster';

const MAX_SWATCHES = 4;

type Toast = { message: string; id: number };

/**
 * Liste des produits. Ordinateur : lignes en colonnes (produit, prix, stock, statut).
 * Mobile : cartes. Chaque produit se déplie : ses coloris, leurs pointures et leur stock,
 * ajustable sur place. Chaque donnée absente a son affichage, jamais une case vide.
 */
export default function ProductList({ products, lowStockThreshold }: { products: AdminProductRow[]; lowStockThreshold: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
      {/* En-têtes (ordinateur) */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] gap-6 border-b border-border px-6 py-3 text-[0.71875rem] font-semibold uppercase tracking-[0.16em] text-muted-ink lg:grid"
      >
        <span>Produit</span>
        <span>Prix</span>
        <span>Stock</span>
        <span>Statut</span>
        <span className="w-[6.5rem]" />
      </div>

      <ul className="divide-y divide-border">
        {products.map((product) => {
          const open = expanded.has(product.id);
          const panelId = `colorways-${product.id}`;
          const toggleLabel = `${open ? 'Masquer' : 'Afficher'} les coloris de ${product.brandName} ${product.name}`;
          return (
          <li
            key={product.id}
            className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 p-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] lg:items-center lg:gap-6 lg:px-6', open && 'bg-page/60')}
          >
            {/* Produit */}
            <div className="col-span-2 flex min-w-0 items-center gap-4 lg:col-span-1 lg:gap-3">
              <button
                type="button"
                onClick={() => toggle(product.id)}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={toggleLabel}
                className="hidden size-9 shrink-0 place-items-center rounded-xl text-muted-ink transition-colors hover:bg-card hover:text-ink lg:grid"
              >
                <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} strokeWidth={2} aria-hidden="true" />
              </button>
              <Thumbnail product={product} />
              <div className="flex min-w-0 flex-col gap-1.5">
                <Link href={`/admin/produits/${product.id}`} className="truncate text-[0.96875rem] font-semibold hover:text-accent-ink">
                  {product.brandName} {product.name}
                </Link>
                <span className="truncate text-[0.8125rem] text-muted-ink">
                  {[product.categoryName, GENDER_LABEL[product.gender]].filter(Boolean).join(' · ')} · modifié {formatRelative(product.updatedAt)}
                </span>
                <Swatches product={product} />
              </div>
            </div>

            {/* Prix */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-ink lg:hidden">Prix</span>
              {product.price ? (
                <span className="text-[0.9375rem] font-semibold tabular-nums">
                  {product.price.min === product.price.max
                    ? formatFCFA(product.price.min)
                    : `${formatFCFA(product.price.min)} – ${formatFCFA(product.price.max)}`}
                </span>
              ) : (
                <span className="text-sm text-muted-ink">Aucun prix</span>
              )}
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-ink lg:hidden">Stock</span>
              <StockSummary product={product} />
            </div>

            {/* Statut */}
            <div className="flex flex-col items-start gap-1">
              <span
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                  product.isActive ? 'bg-deep text-cream' : 'border border-border text-muted-ink',
                )}
              >
                <span className={cn('size-1.5 rounded-full', product.isActive ? 'bg-accent-soft' : 'bg-muted')} />
                {product.isActive ? 'En ligne' : 'Brouillon'}
              </span>
              {!product.publishable && (
                <span className="text-xs text-muted-ink">{product.isActive ? 'Invisible : rien à vendre' : 'Incomplet pour publier'}</span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-2 flex justify-end lg:col-span-1">
              <ProductRowActions productId={product.id} productName={`${product.brandName} ${product.name}`} isActive={product.isActive} />
            </div>

            {/* Mobile : bouton de dépliage */}
            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-expanded={open}
              aria-controls={panelId}
              className="col-span-2 flex h-11 items-center justify-between rounded-2xl bg-card px-4 text-sm lg:hidden"
            >
              <span>
                Coloris et stock{' '}
                <span className="text-muted-ink">
                  ({product.colorways.length} coloris · {product.totalStock} paire{product.totalStock > 1 ? 's' : ''})
                </span>
              </span>
              <ChevronDown className={cn('size-4 text-muted-ink transition-transform duration-200', open && 'rotate-180')} strokeWidth={2} aria-hidden="true" />
            </button>

            {open && (
              <div id={panelId} className="col-span-2 lg:col-span-5">
                <ColorwaysPanel product={product} lowStockThreshold={lowStockThreshold} onDone={(message) => setToast({ message, id: Date.now() })} />
              </div>
            )}
          </li>
          );
        })}
      </ul>
    </div>

    {/* Notification après un ajustement de stock */}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6">
      {toast && (
        <p key={toast.id} role="status" className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl bg-deep px-4 py-3 text-sm text-cream shadow-lg">
          <CheckCircle2 className="mt-px size-4 shrink-0 text-accent-soft" strokeWidth={2} aria-hidden="true" />
          {toast.message}
        </p>
      )}
    </div>
    </>
  );
}

/**
 * Coloris d'un produit : photo, prix, statut, stock, et chaque pointure avec son stock.
 * Toucher une pointure ouvre l'ajustement (réassort ou correction).
 */
function ColorwaysPanel({
  product,
  lowStockThreshold,
  onDone,
}: {
  product: AdminProductRow;
  lowStockThreshold: number;
  onDone: (message: string) => void;
}) {
  const [adjusting, setAdjusting] = useState<string | null>(null);

  if (product.colorways.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-ink">
        <PackageOpen className="size-4" strokeWidth={1.7} aria-hidden="true" />
        Aucun coloris. Ouvre le produit pour en ajouter un.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2 rounded-[22px] bg-card p-2">
      {product.colorways.map((colorway) => {
        const adjustingVariant = colorway.variants.find((v) => v.id === adjusting);
        return (
          <li key={colorway.id} className={cn('flex flex-col gap-3 rounded-2xl bg-surface p-3 sm:p-4', !colorway.isActive && 'opacity-70')}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex min-w-[12rem] flex-1 items-center gap-3">
                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-card">
                  {colorway.imageUrl ? (
                    <Image src={colorway.imageUrl} alt="" width={96} height={96} sizes="48px" className="size-full object-contain p-1 mix-blend-multiply" />
                  ) : (
                    <ImageOff className="size-4 text-muted-ink" strokeWidth={1.6} aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{colorway.name}</span>
                  <span className={cn('text-xs font-medium', colorway.isActive ? 'text-[#1F6B3A]' : 'text-muted-ink')}>
                    {colorway.isActive ? 'En vente' : 'Masqué'}
                  </span>
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold tabular-nums">{formatFCFA(colorway.price)}</span>
                {colorway.compareAtPrice && <span className="text-xs text-muted-ink line-through">{formatFCFA(colorway.compareAtPrice)}</span>}
              </span>
              <span className={cn('text-sm tabular-nums', colorway.stock === 0 ? 'font-semibold text-accent-ink' : 'text-ink')}>
                {colorway.stock === 0 ? 'Rupture' : `${colorway.stock} paire${colorway.stock > 1 ? 's' : ''}`}
              </span>
            </div>

            {colorway.variants.length === 0 ? (
              <p className="text-xs text-muted-ink">Aucune pointure.</p>
            ) : (
              <ul aria-label={`Pointures de ${colorway.name}`} className="flex flex-wrap gap-1.5">
                {colorway.variants.map((variant) => {
                  const out = variant.stock === 0;
                  const low = !out && variant.stock <= lowStockThreshold;
                  const selected = adjusting === variant.id;
                  return (
                    <li key={variant.id}>
                      <button
                        type="button"
                        onClick={() => setAdjusting(selected ? null : variant.id)}
                        aria-expanded={selected}
                        aria-label={`Pointure ${variant.sizeEu} : ${variant.stock} paire${variant.stock > 1 ? 's' : ''}${variant.isActive ? '' : ', masquée'}. Ajuster le stock`}
                        title={variant.sku}
                        className={cn(
                          'flex h-12 min-w-[3.25rem] flex-col items-center justify-center rounded-xl border px-2 transition-colors',
                          selected ? 'border-deep bg-deep text-cream' : 'border-border hover:border-ink',
                          !variant.isActive && !selected && 'border-dashed opacity-60',
                        )}
                      >
                        <span className="text-sm font-semibold leading-none">{variant.sizeEu}</span>
                        <span
                          className={cn(
                            'mt-1 text-[0.6875rem] font-semibold leading-none tabular-nums',
                            selected ? 'text-accent-soft' : out ? 'text-accent-ink' : low ? 'text-[#A15C00]' : 'text-muted-ink',
                          )}
                        >
                          {out ? '0' : `×${variant.stock}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {adjustingVariant && (
              <StockAdjuster
                key={adjustingVariant.id}
                variantId={adjustingVariant.id}
                label={`${product.brandName} ${product.name} ${colorway.name} · ${adjustingVariant.sizeEu}`}
                currentStock={adjustingVariant.stock}
                onCancel={() => setAdjusting(null)}
                onDone={(message) => {
                  setAdjusting(null);
                  onDone(message);
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Thumbnail({ product }: { product: AdminProductRow }) {
  return (
    <Link
      href={`/admin/produits/${product.id}`}
      tabIndex={-1}
      aria-hidden="true"
      className="relative grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-card"
    >
      {product.thumbnail?.url ? (
        <Image
          src={product.thumbnail.url}
          alt=""
          width={144}
          height={144}
          sizes="72px"
          className="size-full object-contain p-1.5 mix-blend-multiply"
        />
      ) : (
        <span className="flex flex-col items-center gap-1 text-muted-ink">
          <ImageOff className="size-5" strokeWidth={1.6} />
          <span className="text-[0.625rem] font-medium">Sans photo</span>
        </span>
      )}
    </Link>
  );
}

function Swatches({ product }: { product: AdminProductRow }) {
  if (product.colorways.length === 0) {
    return <span className="text-xs font-medium text-accent-ink">Aucun coloris</span>;
  }
  const shown = product.colorways.slice(0, MAX_SWATCHES);
  const rest = product.colorways.length - shown.length;
  return (
    <div className="flex items-center gap-2">
      <ul className="flex -space-x-2">
        {shown.map((colorway) => (
          <li
            key={colorway.id}
            title={`${colorway.name}${colorway.isActive ? '' : ' (masqué)'}`}
            className={cn('grid size-7 place-items-center overflow-hidden rounded-full bg-card ring-2 ring-surface', !colorway.isActive && 'opacity-40')}
          >
            {colorway.imageUrl ? (
              <Image src={colorway.imageUrl} alt="" width={56} height={56} sizes="28px" className="size-full object-contain mix-blend-multiply" />
            ) : (
              <span className="text-[0.625rem] font-semibold text-muted-ink">{colorway.name.charAt(0).toUpperCase()}</span>
            )}
          </li>
        ))}
      </ul>
      <span className="text-xs text-muted-ink">
        {product.colorways.length} coloris{rest > 0 ? ` (+${rest})` : ''}
      </span>
    </div>
  );
}

function StockSummary({ product }: { product: AdminProductRow }) {
  if (!product.sizes) {
    return <span className="text-sm text-muted-ink">Aucune pointure en vente</span>;
  }
  const range = product.sizes.min === product.sizes.max ? `${product.sizes.min}` : `${product.sizes.min}–${product.sizes.max}`;
  return (
    <>
      {product.totalStock === 0 ? (
        <span className="inline-flex h-7 items-center self-start rounded-full bg-[#FBE3EE] px-3 text-xs font-semibold text-accent-ink">Rupture</span>
      ) : (
        <span className="text-[0.9375rem] font-semibold tabular-nums">
          {product.totalStock} paire{product.totalStock > 1 ? 's' : ''}
        </span>
      )}
      <span className="text-xs text-muted-ink">
        {product.sizes.count} pointure{product.sizes.count > 1 ? 's' : ''} · {range}
      </span>
      {product.lowStockSizes > 0 && product.totalStock > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium text-accent-ink">
          <TriangleAlert className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
          {product.lowStockSizes} pointure{product.lowStockSizes > 1 ? 's' : ''} en stock bas
        </span>
      )}
    </>
  );
}
