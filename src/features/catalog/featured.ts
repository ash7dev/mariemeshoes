/** « Coup de cœur de la semaine » : constantes et types partagés (sans accès base, importable côté client). */

/** Durée d'un coup de cœur. */
export const FEATURED_DAYS = 7;

export type FeaturedState = {
  /** Coup de cœur actuel de la boutique (tous produits), s'il est encore valable. */
  current: { colorwayId: string; productId: string; label: string; until: string } | null;
  /** Coloris de CE produit qui peuvent être mis en avant (actifs et publiés). */
  candidates: Array<{ id: string; name: string }>;
};
