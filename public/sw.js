/*
 * Service worker de Mariemeshoes (boutique et admin).
 *
 * Volontairement minimal : AUCUNE page ni donnée n'est mise en cache (prix, stock,
 * commandes doivent toujours être à jour). Il sert à deux choses :
 *  - quand le téléphone n'a plus de réseau, afficher la page « Pas de connexion » ;
 *  - recevoir les notifications push de l'admin (nouvelle commande, stock bas)
 *    et ouvrir la bonne page quand on les touche.
 */
const CACHE = 'ms-offline-v1';
const OFFLINE_URL = '/hors-ligne';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Seulement les ouvertures de page : tout le reste passe directement par le réseau.
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((page) => page ?? Response.error())));
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Mariemeshoes';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/admin-192.png',
      badge: '/icons/admin-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      lang: 'fr',
      data: { url: data.url || '/admin' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Une fenêtre de l'admin déjà ouverte : on la réutilise.
      const open = windows.find((w) => w.url.startsWith(self.location.origin + '/admin'));
      if (open) return open.navigate(url).then((w) => (w || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
