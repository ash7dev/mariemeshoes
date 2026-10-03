'use client';

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import { SIZE_COOKIE, parseSize, sizeCookie } from './sizes';

/*
 * Pointure du client : « choisie une fois, tout le site s'adapte ».
 * Source de vérité : le cookie (le serveur pourra filtrer le catalogue avec).
 * Côté serveur et au premier rendu, la pointure vaut null : les pages restent
 * statiques, la valeur apparaît dès l'hydratation.
 */

const listeners = new Set<() => void>();

function readSize(): number | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIZE_COOKIE}=([^;]*)`));
  return parseSize(match?.[1]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setShoeSize(size: number | null) {
  document.cookie = sizeCookie(size);
  for (const listener of listeners) listener();
}

/** Pointure choisie, ou null. */
export function useShoeSize(): number | null {
  return useSyncExternalStore(subscribe, readSize, () => null);
}

type SizePickerContext = {
  open: boolean;
  openPicker: () => void;
  closePicker: () => void;
};

const Context = createContext<SizePickerContext | null>(null);

export function SizeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => setOpen(true), []);
  const closePicker = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openPicker, closePicker }), [open, openPicker, closePicker]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Ouverture du sélecteur de pointure (bouton du header desktop, sphère du dock mobile). */
export function useSizePicker(): SizePickerContext {
  const context = useContext(Context);
  if (!context) throw new Error('useSizePicker doit être utilisé dans <SizeProvider>');
  return context;
}
