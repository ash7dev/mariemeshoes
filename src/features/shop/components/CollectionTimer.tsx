'use client';

import { useEffect, useState } from 'react';
import { timerLabel } from '../collection-timer';

/** Date de fin d'une collection, mise à jour toutes les 30 secondes (compte à rebours en fin de collection). */
export default function CollectionTimer({ endsAt, initial }: { endsAt: string; initial: string }) {
  const [label, setLabel] = useState(initial);
  useEffect(() => {
    const tick = () => setLabel(timerLabel(endsAt, Date.now()));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [endsAt]);
  return <span suppressHydrationWarning>{label}</span>;
}
