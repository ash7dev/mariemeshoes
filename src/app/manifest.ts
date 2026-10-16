import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Application installable de la boutique (PWA) : « Ajouter à l'écran d'accueil »
 * sur Android, iPhone et ordinateur. L'admin a sa propre application
 * (/manifest-admin.webmanifest), avec sa propre icône.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${siteConfig.name} — Sneakers neuves au Sénégal`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: 'fr',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#2A0E1E',
    theme_color: '#FAF7F2',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/store-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/store-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/store-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Boutique', url: '/boutique', icons: [{ src: '/icons/store-192.png', sizes: '192x192' }] },
      { name: 'Mon panier', url: '/panier', icons: [{ src: '/icons/store-192.png', sizes: '192x192' }] },
      { name: 'Galerie', url: '/galerie', icons: [{ src: '/icons/store-192.png', sizes: '192x192' }] },
    ],
  };
}
