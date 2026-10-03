import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AdminRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AdminSession = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
};

/**
 * Admin connecté, ou null. Deux vérifications, menées EN PARALLÈLE :
 *  - l'utilisateur est validé auprès du serveur Supabase Auth (getUser : détecte aussi
 *    une session révoquée, par « Déconnecter tous mes appareils ») ;
 *  - il possède un profil admin ACTIF en base.
 * L'identifiant pour lire le profil vient du jeton, vérifié localement (getClaims,
 * signature ES256, ~4 ms) ; le résultat n'est retenu que si getUser confirme le même
 * utilisateur. Mis en cache pour la durée d'une requête.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const [{ data }, profile] = await Promise.all([
    supabase.auth.getUser(),
    withDbRetry(() =>
      prisma.adminProfile.findUnique({
        where: { id: userId },
        select: { fullName: true, role: true, isActive: true },
      }),
    ),
  ]);
  const user = data.user;
  if (!user?.email || user.id !== userId || !profile?.isActive) return null;

  return { id: user.id, email: user.email, fullName: profile.fullName, role: profile.role };
});

/**
 * À appeler en tête de chaque page, layout et Server Action admin.
 * Une Server Action est appelable directement : le middleware ne suffit pas.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
