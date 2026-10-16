'use client';

/** Recharge la page demandée (le service worker la resservira dès que le réseau revient). */
export default function RetryButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="mt-2 flex h-12 items-center rounded-full bg-deep px-6 text-sm font-semibold text-cream">
      Réessayer
    </button>
  );
}
