import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import RetryButton from './RetryButton';

export const metadata: Metadata = {
  title: 'Pas de connexion',
  robots: { index: false, follow: false },
};

/**
 * Page affichée par le service worker quand le téléphone n'a plus de réseau.
 * Statique et sans base de données : elle est gardée en cache dès l'installation.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-page px-6 text-center text-ink">
      <span className="grid size-[72px] place-items-center rounded-full bg-section text-accent-ink">
        <WifiOff className="size-8" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="font-display text-[1.375rem] leading-none">Mariemeshoes</p>
      <h1 className="font-display text-[2.25rem] leading-tight">Pas de connexion</h1>
      <p className="max-w-sm text-[0.9375rem] leading-relaxed text-muted-ink">
        Ton téléphone n’a plus de réseau. Ton panier est gardé : réessaie dès que la connexion revient.
      </p>
      <RetryButton />
    </main>
  );
}
