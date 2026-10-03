'use client';

import { setShoeSize } from '@/features/size/SizeProvider';

/** « Voir toutes les pointures » : retire la pointure choisie (la page se recharge via SizeSync). */
export default function ClearSizeButton() {
  return (
    <button
      type="button"
      onClick={() => setShoeSize(null)}
      className="flex h-12 items-center rounded-full border-[1.5px] border-ink px-6 text-sm font-semibold transition-colors hover:bg-ink hover:text-cream"
    >
      Voir toutes les pointures
    </button>
  );
}
