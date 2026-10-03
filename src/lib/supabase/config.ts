/**
 * Cookie de session admin.
 * - httpOnly : illisible par JavaScript. Aucun client Supabase côté navigateur,
 *   l'authentification passe par le serveur.
 * - secure (production) : envoyé uniquement en HTTPS.
 * - sameSite lax : pas envoyé par les requêtes forgées depuis un autre site.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

/**
 * URL et clé publique du projet Supabase.
 * Échoue explicitement si la configuration manque, plutôt que de se connecter
 * silencieusement à un autre projet.
 */
export function getSupabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Configuration Supabase manquante : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  return { url, key };
}
