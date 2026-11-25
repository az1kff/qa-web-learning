const CACHE = 'put-v-it-static-3';
const FILES = [
  './index.html','./style.css','./app.mjs','./views.mjs','./state.mjs','./course.mjs','./content-qa.mjs','./content-web.mjs','./practice.mjs','./checkpoints.mjs',
  './manifest.webmanifest','./icon-192.png','./icon-512.png','./stand.html','./stand.mjs','./browser-workshop.mjs',
  './exercise.mjs','./exercise.test.mjs','./sql-practice.mjs','./ci-node-tests.yml','./practice-guide.txt',
];
const urls = new Set(FILES.map(file => new URL(file, self.registration.scope).href));
const file = name => new URL(name, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('put-v-it-static-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const target = new URL(request.url);
  if (request.method !== 'GET' || target.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && ['', 'index.html', 'stand.html'].some(name => target.pathname === new URL(name, self.registration.scope).pathname)) {
    const offlinePage = target.pathname.endsWith('/stand.html') ? 'stand.html' : 'index.html';
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE);
        return await cache.match(file(offlinePage)) ?? Response.error();
      }
    })());
    return;
  }
  if (urls.has(target.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return await cache.match(request) ?? await fetch(request);
    })());
  }
});
