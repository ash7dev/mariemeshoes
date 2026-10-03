import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { AUTH_COOKIE_OPTIONS, getSupabaseConfig } from './config';

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers),
 * dont la session vit dans les cookies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Appelé depuis un Server Component (cookies en lecture seule) : sans conséquence.
        }
      },
    },
  });
}
