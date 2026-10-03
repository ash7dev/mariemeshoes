'use client';

import { useSyncExternalStore } from 'react';
import { MAX_LINES, MAX_QUANTITY } from './limits';

/*
 * Panier du client, gardé dans le navigateur (localStorage).
 * On n'y garde QUE les pointures et les quantités (et le code promo saisi) :
 * prix, stock, noms et photos sont toujours relus sur le serveur, qui fait foi.
 */

export type CartLine = { variantId: string; quantity: number };
export type CartState = { lines: CartLine[]; code: string | null };

const KEY = 'ms_cart_v1';

const EMPTY: CartState = { lines: [], code: null };
const listeners = new Set<() => void>();
let snapshot: CartState | null = null;

function read(): CartState {
  if (snapshot) return snapshot;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<CartState> | null;
    const lines = Array.isArray(raw?.lines)
      ? raw.lines
          .filter((l): l is CartLine => typeof l?.variantId === 'string' && Number.isInteger(l?.quantity) && l.quantity > 0)
          .slice(0, MAX_LINES)
          .map((l) => ({ variantId: l.variantId, quantity: Math.min(l.quantity, MAX_QUANTITY) }))
      : [];
    snapshot = { lines, code: typeof raw?.code === 'string' && raw.code ? raw.code : null };
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

function write(next: CartState) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Navigation privée ou stockage plein : le panier vit le temps de la page.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Un autre onglet a modifié le panier.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Le panier, ou null pendant le rendu serveur / l'hydratation. */
export function useCart(): CartState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Nombre de paires (pastille du header). 0 avant l'hydratation. */
export function useCartCount(): number {
  const cart = useCart();
  return cart ? cart.lines.reduce((sum, l) => sum + l.quantity, 0) : 0;
}

export function addToCart(variantId: string, quantity = 1) {
  const { lines, code } = read();
  const existing = lines.find((l) => l.variantId === variantId);
  const next = existing
    ? lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QUANTITY) } : l))
    : [...lines, { variantId, quantity: Math.min(quantity, MAX_QUANTITY) }].slice(-MAX_LINES);
  write({ lines: next, code });
}

export function setQuantity(variantId: string, quantity: number) {
  const { lines, code } = read();
  if (quantity <= 0) return removeLine(variantId);
  write({ lines: lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, MAX_QUANTITY) } : l)), code });
}

/** Retire une ligne ; renvoie sa position pour « Annuler ». */
export function removeLine(variantId: string): number {
  const { lines, code } = read();
  const index = lines.findIndex((l) => l.variantId === variantId);
  write({ lines: lines.filter((l) => l.variantId !== variantId), code });
  return index;
}

export function restoreLine(line: CartLine, index: number) {
  const { lines, code } = read();
  const next = lines.filter((l) => l.variantId !== line.variantId);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, line);
  write({ lines: next, code });
}

export function setCartCode(code: string | null) {
  write({ ...read(), code: code ? code.trim().toUpperCase() : null });
}

export function clearCart() {
  write(EMPTY);
}
