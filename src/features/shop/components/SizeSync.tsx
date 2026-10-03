'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShoeSize } from '@/features/size/SizeProvider';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';

/**
 * La page a été rendue avec la pointure du cookie. Si le client en choisit une autre
 * (ruban, sélecteur du header ou du dock), on recharge les données du serveur.
 */
export default function SizeSync({ serverSize }: { serverSize: number | null }) {
  const router = useRouter();
  // Abonnement : l'effet se relance à chaque changement de pointure.
  const size = useShoeSize();

  useEffect(() => {
    // On relit le cookie : pendant l'hydratation, `size` vaut encore null.
    const match = document.cookie.match(new RegExp(`(?:^|; )${SIZE_COOKIE}=([^;]*)`));
    if (parseSize(match?.[1]) !== serverSize) router.refresh();
  }, [size, serverSize, router]);

  return null;
}
