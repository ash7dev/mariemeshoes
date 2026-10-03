'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Montants masquables sur mobile (consulter le tableau de bord en public).
 * Le choix est mémorisé sur l'appareil.
 */

const STORAGE_KEY = 'ms-admin-hide-amounts';

const Context = createContext<{ hidden: boolean; toggle: () => void }>({ hidden: false, toggle: () => {} });

export function AmountsProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // Stockage indisponible (navigation privée) : montants visibles.
    }
  }, []);

  const toggle = useCallback(() => {
    setHidden((value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value ? '0' : '1');
      } catch {
        // Sans stockage, le choix vaut pour la visite.
      }
      return !value;
    });
  }, []);

  return <Context.Provider value={{ hidden, toggle }}>{children}</Context.Provider>;
}

/** Un montant, remplacé par « ••• ••• » quand les montants sont masqués. */
export function Amount({ children, className }: { children: React.ReactNode; className?: string }) {
  const { hidden } = useContext(Context);
  return <span className={cn('tabular-nums', className)}>{hidden ? '••• •••' : children}</span>;
}

export function AmountsToggle({ className }: { className?: string }) {
  const { hidden, toggle } = useContext(Context);
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? 'Afficher les montants' : 'Masquer les montants'}
      className={cn('grid size-9 place-items-center rounded-full text-cream/75 hover:text-cream', className)}
    >
      <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
