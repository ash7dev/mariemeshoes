/** Espace insécable : un montant ne se coupe jamais en fin de ligne. */
const NBSP = ' ';

const fcfaFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/**
 * Formate un montant entier en FCFA.
 * Exemple : 45000 → « 45 000 FCFA » (espaces insécables).
 */
export function formatFCFA(amount: number): string {
  if (!Number.isFinite(amount)) return `0${NBSP}FCFA`;
  return `${fcfaFormatter.format(Math.round(amount)).replace(/\s/g, NBSP)}${NBSP}FCFA`;
}
