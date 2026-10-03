import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PackageOpen, PackagePlus, Plus, SearchX } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import {
  PRODUCT_STATUSES,
  PRODUCTS_PER_PAGE,
  listAdminProducts,
  listBrandsForFilter,
  parseProductListParams,
  productListHref,
  type ProductStatusFilter,
} from '@/features/catalog/list-queries';
import StatusTabs from '@/features/catalog/components/list/StatusTabs';
import ProductsToolbar from '@/features/catalog/components/list/ProductsToolbar';
import ProductList from '@/features/catalog/components/list/ProductList';
import Pagination from '@/components/admin/Pagination';
import { LOW_STOCK_THRESHOLD } from '@/features/admin/queries';

export const metadata: Metadata = {
  title: 'Produits · Administration',
  robots: { index: false, follow: false },
};

/** Onglet vide (sans recherche ni filtre) : un message par statut. */
const EMPTY_STATUS: Record<ProductStatusFilter, { title: string; description: string }> = {
  tous: { title: 'Aucun produit', description: 'Ajoute ton premier modèle pour le voir ici.' },
  'en-ligne': { title: 'Rien en boutique', description: 'Aucun produit n’est en ligne : publie un brouillon pour qu’il apparaisse dans la boutique.' },
  brouillons: { title: 'Aucun brouillon', description: 'Tous tes produits sont en ligne.' },
  'stock-bas': { title: 'Aucun stock bas', description: 'Toutes les pointures en vente ont au moins 2 paires.' },
};

const newProductButton = (label: string, className: string) => (
  <Link href="/admin/produits/nouveau" className={className}>
    <Plus className="size-[18px]" strokeWidth={2} aria-hidden="true" />
    {label}
  </Link>
);

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params = parseProductListParams(raw);
  const notice =
    raw.ok === 'cree' ? 'Produit créé. Il apparaît en tête de la liste.' : raw.ok === 'supprime' ? 'Produit supprimé, avec ses coloris, photos et pointures.' : null;
  const [{ products, total, statusCounts, pageCount }, brands] = await Promise.all([listAdminProducts(params), listBrandsForFilter()]);

  // Page au-delà de la dernière (après un filtre ou une mise en brouillon) : dernière page.
  if (params.page > pageCount) redirect(productListHref(params, { page: pageCount }));

  const hasFilters = Boolean(params.q || params.brand);
  const catalogIsEmpty = !hasFilters && statusCounts.tous === 0;
  const hrefs = Object.fromEntries(PRODUCT_STATUSES.map((status) => [status, productListHref(params, { status, page: 1 })])) as Record<
    ProductStatusFilter,
    string
  >;

  return (
    <div className="flex flex-col gap-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Produits</h1>
          {catalogIsEmpty ? (
            <p className="text-sm text-muted-ink">Ton catalogue est vide pour l’instant.</p>
          ) : (
            <p className="text-sm text-muted-ink">
              <span className="tabular-nums">{statusCounts['en-ligne']}</span> en ligne ·{' '}
              <span className="tabular-nums">{statusCounts.brouillons}</span> brouillon{statusCounts.brouillons > 1 ? 's' : ''}
              {statusCounts['stock-bas'] > 0 && (
                <>
                  {' · '}
                  <Link href={hrefs['stock-bas']} className="font-semibold text-accent-ink hover:underline">
                    {statusCounts['stock-bas']} en stock bas
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        {!catalogIsEmpty &&
          newProductButton(
            'Nouveau produit',
            'flex h-12 items-center gap-2 rounded-full bg-deep pl-4 pr-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90',
          )}
      </header>

      {notice && (
        <p role="status" className="rounded-2xl bg-section px-5 py-4 text-sm font-medium text-section-ink">
          {notice}
        </p>
      )}

      {catalogIsEmpty ? (
        // Premier usage : pas de filtres ni d'onglets, une seule action.
        <ListEmptyState
          tone="welcome"
          icon={<PackagePlus strokeWidth={1.5} aria-hidden="true" />}
          title="Ajoute ta première paire"
          description="Un modèle, ses coloris, leurs photos et le stock de chaque pointure : tout se remplit sur une seule page."
          action={newProductButton(
            'Ajouter un produit',
            'flex h-12 items-center gap-2 rounded-full bg-accent pl-4 pr-5 text-sm font-semibold text-white transition-opacity hover:opacity-90',
          )}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            <StatusTabs current={params.status} counts={statusCounts} hrefs={hrefs} />
            <ProductsToolbar brands={brands} initial={{ q: params.q, brand: params.brand, sort: params.sort }} />
          </div>

          {products.length > 0 ? (
            <ProductList products={products} lowStockThreshold={LOW_STOCK_THRESHOLD} />
          ) : hasFilters ? (
            <ListEmptyState
              icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
              title="Aucun produit ne correspond"
              description={
                params.q
                  ? `Rien pour « ${params.q} »${params.status !== 'tous' ? ' dans cet onglet' : ''}. Essaie un autre mot : modèle, marque, coloris ou SKU.`
                  : 'Aucun produit pour ce filtre dans cet onglet.'
              }
              clearHref={productListHref(params, { q: undefined, brand: undefined, page: 1 })}
            />
          ) : (
            <ListEmptyState
              icon={<PackageOpen strokeWidth={1.5} aria-hidden="true" />}
              title={EMPTY_STATUS[params.status].title}
              description={EMPTY_STATUS[params.status].description}
            />
          )}

          <Pagination
            page={params.page}
            pageCount={pageCount}
            total={total}
            perPage={PRODUCTS_PER_PAGE}
            buildHref={(page) => productListHref(params, { page })}
          />
        </>
      )}
    </div>
  );
}
