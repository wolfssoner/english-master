/* English Master service worker: works offline, updates in the background */
const VERSION = '19.0';
const CACHE = 'em-app-' + VERSION;
const FONTS = 'em-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u =>
    fetch(new Request(u, { cache: 'reload' })).then(r => r.ok ? c.put(u, r) : null).catch(() => null)))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('em-app-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

async function networkFirst(req, app) {
  const c = await caches.open(CACHE);
  try {
    const r = await Promise.race([fetch(req, { cache: 'no-cache' }), timeout(app ? 5000 : 15000)]);
    if (app && r && r.ok && r.type === 'basic') c.put('./index.html', r.clone());
    return r;
  } catch (err) {
    return (app && await c.match('./index.html')) || (await c.match(req, { ignoreSearch: true })) || Response.error();
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

async function fonts(req) {
  const c = await caches.open(FONTS);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const p = url.pathname;
    if (/\/version\.json$/.test(p) || /\/packs\//.test(p)) return; // always live
    const app = /\/(index\.html)?$/.test(p);
    if (req.mode === 'navigate' || app) { e.respondWith(networkFirst(req, app)); return; }
    if (/\.(png|svg|webmanifest|ico|json|woff2?)$/.test(p)) { e.respondWith(cacheFirst(req)); return; }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(fonts(req)); return; }
});
