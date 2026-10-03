import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { AUTH_COOKIE_OPTIONS, getSupabaseConfig } from '@/lib/supabase/config';

const LOGIN_PATH = '/admin/login';

/**
 * Espace admin (Next.js 16 : « proxy », ex-middleware) :
 *  1. rafraîchit la session Supabase (cookies) à chaque requête ;
 *  2. renvoie vers la page de connexion toute requête sans session valide.
 *
 * C'est un confort, pas la sécurité : chaque page et chaque Server Action admin
 * appelle requireAdmin(), qui vérifie aussi le profil admin en base.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims() vérifie la signature du jeton : pas de confiance aveugle dans un cookie,
  // sans aller-retour réseau à chaque requête.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && pathname !== LOGIN_PATH) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
