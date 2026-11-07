const VERSION = 'amnestream-v81', IMG = 'amnestream-img-v1';
const SHELL = [
  "index.html",
  "browse.html",
  "anime.html",
  "watch.html",
  "mylist.html",
  "timeline.html",
  "profile.html",
  "settings.html",
  "dmca.html",
  "favicon.svg",
  "manifest.webmanifest",
  "css/atlas.css",
  "css/mobile.css",
  "css/themes.css",
  "css/settings.css",
  "css/sheet-dock.css",
  "css/extras.css",
  "css/me.css",
  "css/style.css",
  "js/anime.js",
  "js/api.js",
  "js/avatar.js",
  "js/bgpicker.js",
  "js/browse.js",
  "js/comments.js",
  "js/config.js",
  "js/mal.js",
  "js/common.js",
  "js/home.js",
  "js/mylist.js",
  "js/profile.js",
  "js/settings.js",
  "js/timeline.js",
  "js/watch.js",
  "js/wave.js",
  "js/scenes.js",
  "js/voxel.js",
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

/* Pages, scripts and styles open instantly from the cache and are refreshed in the background (the newest copy is used on the next visit) */
async function staleWhileRevalidate(e, req, key) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(key);
  const net = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  return networkFirst(req, key);
}

async function cacheFirst(req) {
  const cache = await caches.open(IMG);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    cache.put(req, res.clone());
    cache.keys().then(k => { if (k.length > 400) cache.delete(k[0]); });
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && /\/api\//.test(url.pathname)) return;
  if (url.origin === location.origin) {
    const key = url.pathname.endsWith('.html') || req.mode === 'navigate' ? url.origin + url.pathname : req;
    e.respondWith(staleWhileRevalidate(e, req, key));
  } else if ((url.hostname.endsWith('anilist.co') && req.destination === 'image') ||
             url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
