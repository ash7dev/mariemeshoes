/** Formats du tableau de bord (espaces ordinaires : pas de saut de ligne bizarre dans les tuiles). */

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 1845000 → « 1 845 000 » */
export const num = (n: number) => numberFormat.format(Math.round(n)).replace(/\s/g, ' ');

/** 1845000 → « 1 845 000 FCFA » */
export const money = (n: number) => `${num(n)} FCFA`;

/** 1845000 → « 1,8 M » ; 58000 → « 58 k » */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return num(n);
}

export type Trend = 'up' | 'down' | 'flat';

export function trendOf(change: number | null): Trend {
  if (change === null || Math.abs(change) < 0.005) return 'flat';
  return change > 0 ? 'up' : 'down';
}

/** 0.214 → « +21 % » */
export function signedPercent(change: number): string {
  const value = Math.round(change * 100);
  return `${value > 0 ? '+' : ''}${value} %`;
}

/** Initiales : « Awa Ndiaye » → « AN » */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
