import type { MetadataRoute } from 'next';

// Hors de /admin : le navigateur charge le manifeste sans cookies, le proxy admin l'aurait
// redirigé vers la connexion. Il ne contient rien de privé.
export const dynamic = 'force-static';

/** Application installable de l'admin, distincte de celle de la boutique (icône « ADMIN »). */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: '/admin',
    name: 'Mariemeshoes Admin',
    short_name: 'MS Admin',
    description: 'Commandes, produits, stock et galerie de la boutique.',
    lang: 'fr',
    dir: 'ltr',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FBF4EE',
    theme_color: '#FAF7F2',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/admin-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/admin-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/admin-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Commandes', url: '/admin/commandes', icons: [{ src: '/icons/admin-192.png', sizes: '192x192' }] },
      { name: 'Nouveau produit', url: '/admin/produits/nouveau', icons: [{ src: '/icons/admin-192.png', sizes: '192x192' }] },
      { name: 'Galerie', url: '/admin/galerie', icons: [{ src: '/icons/admin-192.png', sizes: '192x192' }] },
    ],
  };
  return Response.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } });
}
