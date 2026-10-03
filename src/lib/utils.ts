/**
 * Utilitaires transverses
 */

/**
 * Combine des classes CSS conditionnelles (inspiré de clsx / tailwind-merge)
 */
export function cn(...inputs: Array<string | undefined | null | false>): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Helper de temporisation asynchrone (sleep)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
