/**
 * Motif Result<T, E> pour un retour d'exécution explicite et sécurisé
 * (particulièrement adapté aux Server Actions Next.js)
 */
export type Result<T, E = string> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = string>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isFail<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}
