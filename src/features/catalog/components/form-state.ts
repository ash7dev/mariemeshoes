import type { ProductForEdit } from '../queries';
import type { GenderValue, ProductInput } from '../schemas';
import type { ImageItem } from './ImageManager';

/** État local du formulaire produit (les nombres restent des chaînes tant qu'on les saisit). */

export type VariantState = {
  key: string;
  id?: string;
  sizeEu: number;
  stock: string;
  /** Stock en base au chargement : la différence devient un mouvement de stock. */
  stockLoaded: number;
  sku: string;
  isActive: boolean;
};

export type ColorwayState = {
  key: string;
  id?: string;
  name: string;
  styleCode: string;
  price: string;
  compareAtPrice: string;
  isActive: boolean;
  images: ImageItem[];
  variants: VariantState[];
};

export type ProductState = {
  name: string;
  slug: string;
  brandName: string;
  categoryName: string;
  gender: GenderValue | '';
  description: string;
  sizeAdvice: string;
  colorways: ColorwayState[];
};

export function newVariant(sizeEu: number): VariantState {
  return { key: crypto.randomUUID(), sizeEu, stock: '1', stockLoaded: 0, sku: '', isActive: true };
}

export function newColorway(): ColorwayState {
  return { key: crypto.randomUUID(), name: '', styleCode: '', price: '', compareAtPrice: '', isActive: true, images: [], variants: [] };
}

export function emptyProduct(): ProductState {
  return { name: '', slug: '', brandName: '', categoryName: '', gender: '', description: '', sizeAdvice: '', colorways: [newColorway()] };
}

export function productToState(product: ProductForEdit): ProductState {
  return {
    name: product.name,
    slug: product.slug,
    brandName: product.brandName,
    categoryName: product.categoryName,
    gender: product.gender,
    description: product.description,
    sizeAdvice: product.sizeAdvice,
    colorways: product.colorways.map((colorway) => ({
      key: colorway.id,
      id: colorway.id,
      name: colorway.name,
      styleCode: colorway.styleCode,
      price: String(colorway.price),
      compareAtPrice: colorway.compareAtPrice === null ? '' : String(colorway.compareAtPrice),
      isActive: colorway.isActive,
      images: colorway.images.map((image) => ({
        key: image.path,
        status: 'done' as const,
        progress: 1,
        previewUrl: image.url,
        alt: image.alt,
        path: image.path,
        width: image.width ?? undefined,
        height: image.height ?? undefined,
        persisted: true,
      })),
      variants: colorway.variants.map((variant) => ({
        key: variant.id,
        id: variant.id,
        sizeEu: variant.sizeEu,
        stock: String(variant.stock),
        stockLoaded: variant.stock,
        sku: variant.sku,
        isActive: variant.isActive,
      })),
    })),
  };
}

/** Données envoyées à la Server Action (validées par productInputSchema des deux côtés). */
export function stateToInput(state: ProductState, intent: 'draft' | 'publish'): ProductInput {
  return {
    intent,
    name: state.name,
    slug: state.slug,
    brandName: state.brandName,
    categoryName: state.categoryName,
    gender: state.gender as GenderValue,
    description: state.description,
    sizeAdvice: state.sizeAdvice,
    colorways: state.colorways.map((colorway) => ({
      key: colorway.key,
      id: colorway.id,
      name: colorway.name,
      styleCode: colorway.styleCode,
      price: colorway.price,
      compareAtPrice: colorway.compareAtPrice,
      isActive: colorway.isActive,
      images: colorway.images
        .filter((image) => image.status === 'done' && image.path)
        .map((image) => ({ path: image.path!, alt: image.alt, width: image.width, height: image.height })),
      variants: colorway.variants.map((variant) => ({
        key: variant.key,
        id: variant.id,
        sizeEu: variant.sizeEu,
        stock: variant.stock,
        stockLoaded: variant.stockLoaded,
        sku: variant.sku,
        isActive: variant.isActive,
      })),
    })),
  };
}
