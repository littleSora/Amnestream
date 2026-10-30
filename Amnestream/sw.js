/* Service worker: installable app and offline shell; pages, scripts and styles are network-first, AniList posters and Google Fonts cache-first; change VERSION to make every device drop its old copy */
const VERSION = 'amnestream-v48', IMG = 'amnestream-img-v1';
const SHELL = [
  "index.html",
  "browse.html",
  "anime.html",
  "watch.html",
  "mylist.html",
  "timeline.html",
  "profile.html",
  "settings.html",
  "leaderboard.html",
  "dmca.html",
  "favicon.svg",
  "manifest.webmanifest",
  "css/atlas.css",
  "css/mobile.css",
  "css/style.css",
  "js/anime.js",
  "js/api.js",
  "js/browse.js",
  "js/config.js",
  "js/common.js",
  "js/home.js",
  "js/leaderboard.js",
  "js/mylist.js",
  "js/profile.js",
  "js/settings.js",
  "js/timeline.js",
  "js/watch.js",
  "data/catalog.json"
];

self.addEventListener('install', e => e.waitUntil(
  caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(rej, ms))]);

async function networkFirst(req, key) {
  const cache = await caches.open(VERSION);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch {
    const hit = await cache.match(key);
    if (hit) return hit;
    if (req.mode === 'navigate') { const home = await cache.match('index.html'); if (home) return home; }
    return Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(IMG);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    cache.put(req, res.clone());
    cache.keys().then(k => { if (k.length > 400) cache.delete(k[0]); });   // Keep it bounded
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // AniList GraphQL is POST: never touched
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // ?id=... pages share one cached HTML file
    const key = url.pathname.endsWith('.html') || req.mode === 'navigate' ? url.origin + url.pathname : req;
    e.respondWith(networkFirst(req, key));
  } else if ((url.hostname.endsWith('anilist.co') && req.destination === 'image') ||
             url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
