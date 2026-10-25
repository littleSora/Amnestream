/* AniList GraphQL client: slim queries, caching, de-duplicated and abortable requests, multi-host failover */

/* All hosts share the AniList schema, so only the hostname changes; the first to answer wins */
const ANILIST_ENDPOINTS = [
  'https://graphql.aniraku.tech/',   // Primary: full database, no depth cap
  'https://graphql.anilist.co',      // Official: rate limited
];

const EP_COOLDOWN = 60e3;      // Park a failing host for 60s
const RATE_PARK   = 90e3;      // Rate limits park a host longer (per-minute window)
const _epCooldown = new Map();
const _probing    = new Set();
let _epIndex = 0;              // Stay on the host that last worked

/* A host returning empty or malformed lists is parked briefly and skipped */
const THIN_PARK = 120e3;

/* ?host=<name> forces a host for testing (?host=0 clears it) */
const _hostPref = (() => {
  try {
    const q = new URLSearchParams(location.search).get('host');
    if (q === '0') { localStorage.removeItem('as_host'); return ''; }
    if (q) localStorage.setItem('as_host', q);
    return localStorage.getItem('as_host') || '';
  } catch { return ''; }
})();
function _hostOrder() {
  const all = ANILIST_ENDPOINTS.map((_, i) => i);
  if (_hostPref) {
    const h = ANILIST_ENDPOINTS.findIndex(ep => ep.includes(_hostPref));
    if (h > -1) return [h, ...all.filter(i => i !== h)];
  }
  return [_epIndex, ...all.filter(i => i !== _epIndex)];
}
function _thin(data) {
  if (!data) return true;
  const pages = Object.values(data).filter(v => v && v.Page);
  if (!pages.length) return false;
  const lists = pages.flatMap(p => Object.values(p.Page).filter(Array.isArray));
  if (!lists.length || lists.every(l => l.length)) return false;
  if (pages.reduce((n, p) => n + (p.Page.pageInfo?.total || 0), 0) > 0) return true;
  return lists.some(l => l.length);
}

const HOST_GAP  = { 'graphql.anilist.co': 750 };
const _nextSlot = new Map();
const _sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  if (signal) signal.addEventListener('abort',
    () => { clearTimeout(t); rej(Object.assign(new Error('Aborted'), { name: 'AbortError' })); }, { once: true });
});
async function _pace(endpoint, signal) {
  const gap = HOST_GAP[new URL(endpoint).hostname] || 0;
  if (!gap) return;
  const now = Date.now();
  const at = Math.max(now, _nextSlot.get(endpoint) || 0);
  _nextSlot.set(endpoint, at + gap);
  if (at > now) await _sleep(at - now, signal);
}


const EP_COOLDOWN_429 = 10e3;  // Short rate-limit blips park a host for only 10s

/* Errors that mean the host cannot answer, not that the query is wrong */
const VALIDATION_RE = /Cannot query field|Unknown argument|Unknown type|is not defined|Syntax Error/i;

/* Full metadata (details page and spotlight) */
const MEDIA_CORE = `
fragment MediaCore on Media {
  id
  idMal
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  description(asHtml: false)
  averageScore
  meanScore
  popularity
  favourites
  genres
  status
  format
  episodes
  duration
  season
  seasonYear
  countryOfOrigin
  startDate { year month day }
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt timeUntilAiring }
}`;

/* Slim fields for cards, rows and timeline bars */
const MEDIA_CARD = `
fragment MediaCard on Media {
  id
  title { romaji english native }
  coverImage { large color }
  description(asHtml: false)
  genres
  seasonYear
  averageScore
  status
  format
  episodes
  isAdult
  countryOfOrigin
  nextAiringEpisode { episode airingAt }
}`;

/* Slim fields for the watch page */
const MEDIA_PLAYER = `
fragment MediaPlayer on Media {
  id
  idMal
  title { romaji english native }
  coverImage { large }
  status
  format
  episodes
  nextAiringEpisode { episode airingAt }
}`;

/* Slim fields for search suggestions */
const MEDIA_SUGGEST = `
fragment MediaSuggest on Media {
  id
  title { romaji english native }
  coverImage { medium }
  averageScore
  format
  isAdult
}`;

/* Cache */
const TTL = { short: 2 * 60e3, normal: 5 * 60e3, long: 15 * 60e3 };
const _mem = new Map();
const _inflight = new Map();

function _hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + s.length.toString(36);
}
function _cacheGet(key) {
  const hit = _mem.get(key);
  if (hit && hit.exp > Date.now()) return hit;
  try {
    const raw = sessionStorage.getItem('al:' + key);
    if (raw) {
      const o = JSON.parse(raw);
      if (o.exp > Date.now()) { _mem.set(key, o); return o; }
      sessionStorage.removeItem('al:' + key);
    }
  } catch { /* storage unavailable */ }
  return null;
}
function _cacheSet(key, data, ttl) {
  const o = { exp: Date.now() + ttl, data };
  _mem.set(key, o);
  if (_mem.size > 150) _mem.delete(_mem.keys().next().value);
  try { sessionStorage.setItem('al:' + key, JSON.stringify(o)); }
  catch {
    try { Object.keys(sessionStorage).filter(k => k.startsWith('al:')).forEach(k => sessionStorage.removeItem(k)); } catch { /* ignore */ }
  }
}

/* Transport with failover */
const REQ_TIMEOUT = 12e3;          // Give up on requests that hang too long
const MAX_PARALLEL = 4;            // Throttle requests so AniList's rate limit is not mistaken for a dead site
let _busy = 0, _backoffUntil = 0;
const _waiting = [];
const _abortErr = () => new DOMException('Aborted', 'AbortError');
function _slot(signal) {           // Wait for a free slot; leave the queue if the caller aborts
  if (signal?.aborted) return Promise.reject(_abortErr());
  if (_busy < MAX_PARALLEL) { _busy++; return Promise.resolve(); }
  return new Promise((res, rej) => {
    const w = () => { signal?.removeEventListener('abort', onAbort); _busy++; res(); };
    const onAbort = () => { const i = _waiting.indexOf(w); if (i > -1) _waiting.splice(i, 1); rej(_abortErr()); };
    signal?.addEventListener('abort', onAbort, { once: true });
    _waiting.push(w);
  });
}
function _release() { _busy--; const next = _waiting.shift(); if (next) next(); }

async function _post(endpoint, query, variables, signal) {
  await _slot(signal);                       // At most 4 requests in flight
  try {
    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, REQ_TIMEOUT);
    const onAbort = () => ctrl.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    try {
      await _pace(endpoint, signal);
      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query, variables }),
          signal: ctrl.signal,
        });
      } catch (e) {
        if (e && e.name === 'AbortError' && signal && signal.aborted) throw e;   // Caller cancelled
        const err = new Error(timedOut ? 'Timed out' : 'Rate limited');
        err.status = timedOut ? 408 : 429;
        throw err;
      }
      if (res.status === 429) { const err = new Error('Rate limited'); err.status = 429; throw err; }
      if (!res.ok) { const err = new Error('Request failed (' + res.status + ')'); err.status = res.status; throw err; }
      const json = await res.json();
      if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
      return json.data;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  } finally { _release(); }
}
async function _postNow(endpoint, query, variables, signal) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (res.status === 429) {
    const err = new Error('Rate limited');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const err = new Error('Request failed (' + res.status + ')');
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
  return json.data;
}

async function _request(query, variables, signal, valid) {
  let lastErr = null, thinFallback = null;
  const order = _hostOrder();

  for (const idx of order) {
    const ep = ANILIST_ENDPOINTS[idx];
    if ((_epCooldown.get(ep) || 0) > Date.now()) continue;
    if (_probing.has(ep) && idx !== order[0]) continue;

    _probing.add(ep);
    try {
      const data = await _post(ep, query, variables, signal);
      if (_thin(data)) {                                  // Empty 200 is not a real success
        if (!thinFallback) thinFallback = data;
        _epCooldown.set(ep, Date.now() + THIN_PARK);
        continue;
      }
      if (valid && !valid(data)) {                        // Wrong-shaped 200: try the next host without parking
        if (!thinFallback) thinFallback = data;
        continue;
      }
      _epIndex = idx;
      return data;
    } catch (err) {
      if (err && err.name === 'AbortError') throw err;
      lastErr = err;
      if (!VALIDATION_RE.test(err.message || '')) {
        _epCooldown.set(ep, Date.now() + (err.status === 429 ? RATE_PARK : EP_COOLDOWN));
        if (err.status === 429) _backoffUntil = Date.now() + 30e3;   // Delay optional work
        if (idx === _epIndex) _epIndex = 0;                          // Avoid sticking to a dead host
      }
    } finally { _probing.delete(ep); }
  }

  if (thinFallback) return thinFallback;                  // All hosts were thin: show what we have

  const ep = ANILIST_ENDPOINTS[_epIndex] || ANILIST_ENDPOINTS[0];
  try {
    return await _post(ep, query, variables, signal);
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    _epCooldown.set(ep, Date.now() + (err.status === 429 ? RATE_PARK : EP_COOLDOWN));
    const msg = err.status === 429
      ? 'AniList is rate limiting this browser. Try again in a moment.'
      : (err.status === 408 ? 'AniList is not answering. Try again in a moment.'
      : (err.message === 'Failed to fetch' ? 'Could not reach AniList. Check your connection.' : err.message));
    const out = new Error(msg); out.status = err.status; throw out;
  }
}

/* Baked catalog: data/catalog.json holds long-TTL home page answers and is used instead of the network when available */
const BAKE_URL = 'data/catalog.json';
let _baked = null, _bakePromise = null;

const _noBake = (() => {
  try {
    const q = new URLSearchParams(location.search).get('live');
    if (q === '1') localStorage.setItem('as_live', '1');
    if (q === '0') localStorage.removeItem('as_live');
    return !!localStorage.getItem('as_live');
  } catch { return false; }
})();

/* Stored payloads count only when complete; otherwise fall back to live data */
const BAKE_CHECK = {
  homeRails:     d => !!(d && d.trending && (d.trending.media || []).length),
  trendingQuick: d => !!(d && d.Page && (d.Page.media || []).length),
  weeklyTrending: d => !!(d && d.a && (((d.a.mediaTrends || []).length) + ((d.b && d.b.mediaTrends) || []).length)),
  browseLanding: d => !!(d && (d.media || []).length),
};

function _bakeGet(name) {
  const b = _baked;
  if (!b || !name || !b.bake) return null;
  const hit = b.bake[name];
  if (!hit) return null;
  const check = BAKE_CHECK[String(name).split(':')[0]];
  return (!check || check(hit)) ? hit : null;
}

function _bakeLoad() {
  if (_baked) return Promise.resolve(_baked);
  if (!_bakePromise) {
    _bakePromise = fetch(BAKE_URL, { cache: 'force-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j && j.bake) _baked = j; return _baked; })
      .catch(() => null);
  }
  return _bakePromise;
}

function _bakeGetAsync(name) {
  if (!name || _noBake) return Promise.resolve(null);
  if (_baked) return Promise.resolve(_bakeGet(name));
  return _bakeLoad().then(() => _bakeGet(name));
}

/* Options: ttl, signal, fresh, lazy, bake, valid; lazy work is skipped while AniList struggles */
/* Entry point: baked copy if available, otherwise the network */
function gql(query, variables = {}, opts = {}) {
  const name = typeof opts.bake === 'function' ? opts.bake() : opts.bake;
  if (name && !_noBake) return _bakeGetAsync(name).then(hit => hit || _gqlLive(query, variables, opts));
  return _gqlLive(query, variables, opts);
}

function _gqlLive(query, variables, { ttl = TTL.normal, signal, fresh = false, lazy = false, valid } = {}) {
  const key = _hash(query + JSON.stringify(variables));
  if (!fresh) {
    const hit = _cacheGet(key);
    if (hit) return Promise.resolve(hit.data);
  }
  if (lazy && _backoffUntil > Date.now()) return Promise.reject(new Error('AniList is busy'));
  if (_inflight.has(key)) {                         // Join an identical in-flight request
    const shared = _inflight.get(key);
    if (!signal) return shared;
    return new Promise((res, rej) => {              // Callers can still cancel their own wait
      const stop = () => rej(new DOMException('Aborted', 'AbortError'));
      if (signal.aborted) return stop();
      signal.addEventListener('abort', stop, { once: true });
      shared.then(res, rej);
    });
  }

  const p = _request(query, variables, signal, valid).then(data => {
    if (ttl > 0 && (!valid || valid(data))) _cacheSet(key, data, ttl);
    return data;
  });
  if (!signal) {
    _inflight.set(key, p);
    const clear = () => _inflight.delete(key);
    p.then(clear, clear);
  }
  return p;
}

/* Exact counts: AniList caps totals at 5000, so count in slices (status, format, popularity) and sum them */
/* 18+ titles are hidden unless enabled in Settings; applies site-wide */
const adultOn = () => { try { const o = JSON.parse(localStorage.getItem('as_settings')); return !!(o?.includeAdult ?? o?.showAdult); } catch { return false; } };   // showAdult is the old setting name
const adultVar = () => (adultOn() ? undefined : false);        // undefined means no isAdult filter
const COUNT_CAP = 5000;
const COUNT_FORMATS = ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'];
const COUNT_STATUS = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'];

/* Maps picker names to AniList genres or tags (e.g. Military is a tag, not a genre) */
const GENRE_TAGS = {
  'Boys Love': ["Boys' Love", 'Yaoi', 'Boys Love'],
  'Erotica': ['Erotica', 'Nudity'], 'Girls Love': ["Girls' Love", 'Yuri', 'Girls Love'], 'Gourmet': ['Food'],
  'Isekai': ['Isekai'], 'Josei': ['Josei'], 'Kids': ['Kids'], 'Magic': ['Magic'], 'Military': ['Military'],
  'Samurai': ['Samurai'], 'School': ['School'], 'Seinen': ['Seinen'], 'Shoujo': ['Shoujo'], 'Shounen': ['Shounen'],
  'Space': ['Space', 'Space Opera'], 'Vampire': ['Vampire'],
};
/* Splits picked names into genres and tags: a title must match any picked genre AND any picked tag; safe to run twice */
function _gsplit(base) {
  const genres = [], tags = [...(base.tags || [])];
  for (const g of base.genres || []) (GENRE_TAGS[g] ? tags.push(...GENRE_TAGS[g]) : genres.push(g));
  return { ...base, genres: genres.length ? genres : undefined, tags: tags.length ? [...new Set(tags)] : undefined };
}

/* Declares filters as GraphQL variables for count and deep-page queries */
function _filterDecl(base) {
  const decl = [], vars = {}, has = {};
  const add = (key, type, v) => {
    has[key] = v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
    if (has[key]) { decl.push(`$${key}: ${type}`); vars[key] = v; }
  };
  add('search', 'String', base.search); add('genres', '[String]', base.genres); add('tags', '[String]', base.tags);
  add('format', 'MediaFormat', base.format); add('status', 'MediaStatus', base.status);
  add('season', 'MediaSeason', base.season); add('year', 'Int', base.year);
  return { decl, vars, has };
}
const _filterArgs = has => [
  has.search && 'search: $search', has.genres && 'genre_in: $genres', has.tags && 'tag_in: $tags', has.season && 'season: $season',
  has.format && 'format: $format', has.status && 'status: $status', has.year && 'seasonYear: $year',
].filter(Boolean);
const _baseOf = v => _gsplit({ search: v.search, genres: v.genres, format: v.format, status: v.status, season: v.season, year: v.year });

/* Popularity ranges that cover every title; POP is the first cut and over-cap ranges are halved */
const POP = [-1, 5, 20, 60, 150, 400, 1000, 2500, 6000, 15000, 40000, 100000, 10000000];
function popSlices(pop) {
  if (!pop) return POP.slice(1).map((hi, i) => ({ pop: [POP[i], hi] }));
  const [lo, hi] = pop;
  if (hi - lo <= 1) return null;                                    // Single value still over the cap
  const mid = Math.floor((lo + hi) / 2);
  return [{ pop: [lo, mid] }, { pop: [mid, hi] }];
}

function _sliceQuery(base, slices) {
  const { decl, vars, has } = _filterDecl(base);
  const body = slices.map((sl, i) => {
    const a = ['type: ANIME'];
    if (!adultOn()) a.push('isAdult: false');
    if (has.search) a.push('search: $search');
    if (has.genres) a.push('genre_in: $genres');
    if (has.tags) a.push('tag_in: $tags');
    if (has.season) a.push('season: $season');
    // Each is either the user's pick (variable) or the slice being counted (constant)
    if (has.format) a.push('format: $format');
    else if (sl.format) a.push(`format: ${sl.format}`);
    else if (sl.formatRest) a.push(`format_not_in: [${COUNT_FORMATS.join(', ')}]`);
    if (has.status) a.push('status: $status'); else if (sl.status) a.push(`status: ${sl.status}`);
    if (has.year) a.push('seasonYear: $year'); else if (sl.year) a.push(`seasonYear: ${Number(sl.year)}`);
    if (sl.pop) a.push(`popularity_greater: ${Number(sl.pop[0])}`, `popularity_lesser: ${Number(sl.pop[1]) + 1}`);   // (lo, hi] range
    return `s${i}: Page(page: 1, perPage: 1) { pageInfo { total } media(${a.join(', ')}) { id } }`;
  }).join('\n  ');
  return { query: `query Count${decl.length ? '(' + decl.join(', ') + ')' : ''} {\n  ${body}\n}`, vars };
}

async function _countSlices(base, slices, signal, lazy = true) {
  const chunks = [];
  for (let i = 0; i < slices.length; i += 30) chunks.push(slices.slice(i, i + 30));    // Keep requests small
  const parts = await Promise.all(chunks.map(async ch => {
    const { query, vars } = _sliceQuery(base, ch);
    const d = await gql(query, vars, { ttl: TTL.long, signal, lazy });
    return ch.map((_, i) => {
      const t = d?.['s' + i]?.pageInfo?.total;
      if (typeof t !== 'number') throw new Error('Count unavailable');
      return t;
    });
  }));
  return parts.flat();
}

/* Deep paging past AniList's 5000-title cap: split by popularity ranges, count each, map a page to its ranges */
const _planCache = new Map();                                   // Filters to cached plan of popularity ranges (lowest first)
const _planKey = base => JSON.stringify([base, adultOn()]);
const _planPeek = base => { const h = _planCache.get(_planKey(base)); return !!(h && h.exp > Date.now()); };

function _popBuckets(base) {
  const key = _planKey(base), hit = _planCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.p;
  const expand = async slices => {                              // No abort signal: the plan is shared, so one cancelled page must not kill it
    const totals = await _countSlices(base, slices, undefined, false);
    const parts = await Promise.all(slices.map((sl, i) => {
      if (totals[i] < COUNT_CAP) return [{ pop: sl.pop, count: totals[i] }];
      const kids = popSlices(sl.pop);                           // Still over the cap: halve it
      return kids ? expand(kids) : [{ pop: sl.pop, count: COUNT_CAP, capped: true }];
    }));
    return parts.flat();                                        // Promise.all keeps order, so ranges stay sorted by popularity
  };
  const p = expand(popSlices(null));
  _planCache.set(key, { exp: Date.now() + TTL.long, p });
  p.catch(() => _planCache.delete(key));
  return p;
}

/* Finds which ranges and offsets make up a global page (walks ranges backwards for DESC order) */
function _planWindow(leaves, offset, per) {
  const segs = [];
  let skip = offset, need = per;
  for (let i = leaves.length - 1; i >= 0 && need > 0; i--) {
    const lf = leaves[i];
    if (skip >= lf.count) { skip -= lf.count; continue; }         // Range is entirely before this page
    const take = Math.min(need, lf.count - skip);
    segs.push({ pop: lf.pop, from: Math.floor(skip / per) + 1, to: Math.floor((skip + take - 1) / per) + 1, cut: skip % per, take });
    need -= take; skip = 0;
  }
  return segs;
}

function _deepQuery(base, segs, per) {
  const { decl, vars, has } = _filterDecl(base);
  const common = ['type: ANIME', ...(adultOn() ? [] : ['isAdult: false']), ..._filterArgs(has), 'sort: POPULARITY_DESC'];
  const rows = [];
  segs.forEach((sg, i) => {
    const a = [...common, `popularity_greater: ${Number(sg.pop[0])}`, `popularity_lesser: ${Number(sg.pop[1]) + 1}`];    // (lo, hi] range
    for (let pg = sg.from; pg <= sg.to; pg++) rows.push(`p${i}_${pg}: Page(page: ${pg}, perPage: ${per}) { media(${a.join(', ')}) { ...MediaCard } }`);
  });
  return { query: `${MEDIA_CARD}\nquery Deep${decl.length ? '(' + decl.join(', ') + ')' : ''} {\n  ${rows.join('\n  ')}\n}`, vars };
}

const Api = {
  /* Debug helper: live and parked hosts */
  endpoints() {
    const now = Date.now();
    return ANILIST_ENDPOINTS.map(ep => ({
      endpoint: ep,
      parked: (_epCooldown.get(ep) || 0) > now,
      retryInMs: Math.max(0, (_epCooldown.get(ep) || 0) - now),
    }));
  },

  /* Debug helper: baked catalog status */
  bakeInfo() {
    return {
      loaded: !!_baked, off: _noBake,
      builtAt: _baked?.builtAt || null, season: _baked?.season || null,
      keys: _baked ? Object.keys(_baked.bake) : [],
    };
  },

  /* Home page data except the latest-episodes rail and schedule */
  homeRails(season, year) {
    return gql(`${MEDIA_CORE}${MEDIA_CARD}
      query Home($season: MediaSeason, $year: Int, $adult: Boolean) {
        trending: Page(page: 1, perPage: 18) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: $adult) { ...MediaCore }
        }
        seasonPopular: Page(page: 1, perPage: 18) {
          media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: $adult) { ...MediaCard }
        }
        topRated: Page(page: 1, perPage: 18) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: $adult) { ...MediaCard }
        }
        topAiring: Page(page: 1, perPage: 18) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: $adult) { ...MediaCard }
        }
        upcoming: Page(page: 1, perPage: 12) {
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: $adult) { ...MediaCard }
        }
      }`, { season, year, adult: adultVar() }, { ttl: TTL.long, bake: () => `homeRails:${season}:${year}:${adultOn() ? 1 : 0}` });
  },

  /* Quick trending list (card fields) so the Trending row paints fast */
  trendingQuick() {
    return gql(`${MEDIA_CARD}
      query TrendNow($adult: Boolean) {
        Page(page: 1, perPage: 18) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: $adult) { ...MediaCard }
        }
      }`, { adult: adultVar() }, { ttl: TTL.long, bake: () => `trendingQuick:${adultOn() ? 1 : 0}` });
  },

  /* Most recently aired episodes, newest first; `until` is rounded to 5 min for a stable cache key */
  latestEpisodes() {
    const until = Math.floor(Date.now() / 300000) * 300;
    return gql(`${MEDIA_CARD}
      query Latest($since: Int, $until: Int) {
        Page(page: 1, perPage: 50) {
          airingSchedules(airingAt_greater: $since, airingAt_lesser: $until, sort: TIME_DESC) {
            airingAt episode
            media { ...MediaCard }
          }
        }
      }`, { since: until - 3 * 86400, until }, { ttl: TTL.short, valid: d => Array.isArray(d?.Page?.airingSchedules) })
      .then(d => (d && d.Page && d.Page.airingSchedules) || []);
  },

  /* Browse > Latest episodes: pages the airing schedule (last 7 days) and applies Browse filters client-side; one show per page */
  async latestAired(vars, page = 1, opts = {}) {
    const until = Math.floor(Date.now() / 300000) * 300;          // 5 min steps keep the cache key stable
    const d = await gql(`${MEDIA_CARD}
      query LatestAired($page: Int, $since: Int, $until: Int) {
        Page(page: $page, perPage: 50) {
          pageInfo { total currentPage lastPage hasNextPage }
          airingSchedules(airingAt_greater: $since, airingAt_lesser: $until, sort: TIME_DESC) {
            airingAt episode
            media { ...MediaCard season tags { name } }
          }
        }
      }`, { page, since: until - 7 * 86400, until },
      { ttl: TTL.short, signal: opts.signal, lazy: opts.lazy, valid: x => Array.isArray(x?.Page?.airingSchedules) });
    const q = (vars.search || '').toLowerCase(), { genres = [], tags = [] } = _gsplit({ genres: vars.genres });
    const seen = new Set(), media = [];
    for (const r of d.Page.airingSchedules) {
      const m = r && r.media;
      if (!m || seen.has(m.id) || m.countryOfOrigin !== 'JP') continue;
      if (m.isAdult && !adultOn()) continue;
      if (vars.format && m.format !== vars.format) continue;
      if (vars.status && m.status !== vars.status) continue;
      if (vars.season && m.season !== vars.season) continue;
      if (vars.year && m.seasonYear !== vars.year) continue;
      if (genres.length && !genres.some(g => (m.genres || []).includes(g))) continue;
      if (tags.length && !tags.some(t => (m.tags || []).some(x => x.name === t))) continue;
      if (q && !Object.values(m.title || {}).some(t => t && String(t).toLowerCase().includes(q))) continue;
      seen.add(m.id);
      media.push({ ...m, __ep: r.episode, __at: r.airingAt });
    }
    const pi = d.Page.pageInfo || {};
    return { Page: { pageInfo: { currentPage: page, lastPage: pi.lastPage || 1, hasNextPage: !!pi.hasNextPage, total: media.length, latest: true }, media } };
  },

  browse({ page = 1, perPage = 30, search, genres: picked, format, status, season, year, sort }, opts) {
    const { genres, tags } = _gsplit({ genres: picked });          // Picker names to AniList genres and tags
    return gql(`${MEDIA_CARD}
      query Browse($page: Int, $perPage: Int, $search: String, $genres: [String], $tags: [String],
                   $format: MediaFormat, $status: MediaStatus, $season: MediaSeason,
                   $year: Int, $sort: [MediaSort], $adult: Boolean) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage lastPage hasNextPage total }
          media(type: ANIME, search: $search, genre_in: $genres, tag_in: $tags, format: $format,
                status: $status, season: $season, seasonYear: $year,
                sort: $sort, isAdult: $adult) { ...MediaCard }
        }
      }`, { page, perPage, search, genres, tags, format, status, season, year, sort, adult: adultVar() }, { ttl: TTL.long, ...opts });   // Cached 15 min so revisiting a genre is instant
  },

  /* Like browse() but not limited to the first 5000 titles; only POPULARITY_DESC can be stitched from ranges, other sorts use browse() */
  async browseDeep(vars, page = vars.page, opts = {}) {
    const per = vars.perPage || 30;
    const sort = [].concat(vars.sort || [])[0];
    const offset = (page - 1) * per;
    if (sort !== 'POPULARITY_DESC') return Api.browse({ ...vars, page }, opts);

    const base = _baseOf(vars);
    let plain = null;
    if (offset + per <= COUNT_CAP) {
      plain = await Api.browse({ ...vars, page }, opts);
      if (plain.Page.pageInfo.total !== COUNT_CAP) return plain;
    }
    if (page === 1 && !Object.values(base).some(Boolean)) {            // Unfiltered landing page
      const baked = await _bakeGetAsync(`browseLanding:${adultOn() ? 1 : 0}`);
      if (baked && baked.media) {
        const total = baked.total || baked.media.length;
        return { Page: { pageInfo: {
          currentPage: 1,
          lastPage: Math.max(1, Math.ceil(total / per)),
          hasNextPage: total > per,
          total,
          deep: !!baked.totalExact,
        }, media: baked.media.slice(0, per) } };
      }
    }
    if (opts.lazy && !_planPeek(base)) throw new Error('AniList is busy');   // Prefetch never pays for counting

    const leaves = await _popBuckets(base);
    const total = leaves.reduce((n, lf) => n + lf.count, 0);
    const pageInfo = { currentPage: page, lastPage: Math.max(1, Math.ceil(total / per)), hasNextPage: offset + per < total, total, deep: true };
    if (plain) return { Page: { ...plain.Page, pageInfo } };               // Inside the first 5000: already loaded

    const segs = _planWindow(leaves, offset, per);
    if (!segs.length) return { Page: { pageInfo, media: [] } };
    const { query, vars: qv } = _deepQuery(base, segs, per);
    const d = await gql(query, qv, { ttl: TTL.long, signal: opts.signal, lazy: opts.lazy });
    const media = segs.flatMap((sg, i) => {
      const all = [];
      for (let pg = sg.from; pg <= sg.to; pg++) all.push(...(d['p' + i + '_' + pg]?.media || []));
      return all.slice(sg.cut, sg.cut + sg.take);
    });
    return { Page: { pageInfo, media } };
  },

  /* Exact result count for a Browse search; only needed when the total hits the cap */
  async browseTotal(base, { signal } = {}) {
    base = _gsplit(base);
    const dims = [
      !base.status && { slices: () => COUNT_STATUS.map(status => ({ status })) },
      !base.format && { slices: () => [...COUNT_FORMATS.map(format => ({ format })), { formatRest: true }] },
    ].filter(Boolean);
    // Last resort: popularity ranges, halving any that are still over the cap
    let approx = false;
    const walk = async (fixed, level) => {
      const dim = dims[level];
      const slices = dim ? dim.slices().map(sl => ({ ...fixed, ...sl })) : popSlices(fixed.pop)?.map(sl => ({ ...fixed, ...sl }));
      if (!slices) { approx = true; return COUNT_CAP; }
      const totals = await _countSlices(base, slices, signal);
      const parts = await Promise.all(slices.map((sl, i) => totals[i] >= COUNT_CAP ? walk(sl, dim ? level + 1 : level) : totals[i]));
      return parts.reduce((a, b) => a + b, 0);
    };
    const total = await walk({}, 0);
    return { total, approx };
  },

  anime(id) {
    return gql(`${MEDIA_CORE}
      query Anime($id: Int) {
        Media(id: $id, type: ANIME) {
          ...MediaCore
          endDate { year month day }
          tags { name rank isMediaSpoiler isGeneralSpoiler }
          synonyms
          streamingEpisodes { title thumbnail }
          trailer { id site }
          externalLinks { site url }
          relations {
            edges {
              relationType
              node { id title { romaji english } coverImage { large } format status }
            }
          }
          recommendations(perPage: 14, sort: RATING_DESC) {
            nodes { mediaRecommendation { id title { romaji english } coverImage { large } description(asHtml: false) genres seasonYear averageScore format status episodes } }
          }
          characters(perPage: 14, sort: [ROLE, RELEVANCE]) {
            nodes { id name { full } image { medium } }
          }
        }
      }`, { id }, { ttl: TTL.long });
  },

  /* Hover popup data: trailer and banner, fetched lazily and cached */
  preview(id) {
    return gql(`query Preview($id: Int) {
      Media(id: $id, type: ANIME) { id bannerImage duration trailer { id site } }
    }`, { id }, { ttl: TTL.long });
  },

  playerMeta(id) {
    return gql(`${MEDIA_PLAYER}
      query PlayerMeta($id: Int) { Media(id: $id, type: ANIME) { ...MediaPlayer } }`, { id }, { ttl: TTL.normal });
  },

  search(q, perPage = 8, opts) {
    return gql(`${MEDIA_SUGGEST}
      query Search($q: String, $perPage: Int, $adult: Boolean) {
        Page(page: 1, perPage: $perPage) {
          media(type: ANIME, search: $q, sort: SEARCH_MATCH, isAdult: $adult) { ...MediaSuggest }
        }
      }`, { q, perPage, adult: adultVar() }, opts);
  },

  /* One day of airing (up to 150 entries) in a single request; bad pages from mirrors are skipped */
  schedule(from, to) {
    const KEYS = ['a', 'b', 'c'];
    const listOf = (d, k) => (d && d[k] && Array.isArray(d[k].airingSchedules)) ? d[k].airingSchedules : null;
    return gql(`query Sched($from: Int, $to: Int) {
      a: Page(page: 1, perPage: 50) { ...Rows }
      b: Page(page: 2, perPage: 50) { ...Rows }
      c: Page(page: 3, perPage: 50) { ...Rows }
    }
    fragment Rows on Page {
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
        airingAt episode
        media { id isAdult countryOfOrigin title { romaji english native } }
      }
    }`, { from, to }, { ttl: TTL.normal, valid: d => KEYS.every(k => listOf(d, k)) })
      .then(d => {
        const lists = KEYS.map(k => listOf(d, k)).filter(Boolean);
        if (!lists.length) throw new Error('The schedule is not available right now. Try again in a moment.');
        return lists.flat().filter(r => r && r.media && (adultOn() || !r.media.isAdult));   // airingSchedules has no isAdult argument, so filter rows here
      });
  },

  /* Timeline: airing-now shows from the user's watched titles */
  timelineFor(ids) {
    return gql(`${MEDIA_CARD}
      query Timeline($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(id_in: $ids, type: ANIME, status: RELEASING, isAdult: false) { ...MediaCard }
        }
      }`, { ids }, { ttl: TTL.normal });
  },

  /* Light status check for new-episode alerts on Continue watching */
  /* Both title languages for a batch of ids (upgrades older saved entries) */
  titlesOf(ids) {
    return gql(`query Ti($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) { id title { romaji english } }
      }
    }`, { ids }, { ttl: TTL.long });
  },

  statusOf(ids) {
    return gql(`query St($ids: [Int]) {
      Page(page: 1, perPage: 50) {
        media(id_in: $ids, type: ANIME) { id status episodes nextAiringEpisode { episode } }
      }
    }`, { ids }, { ttl: TTL.normal });
  },

  /* Weekly ranking from daily trend scores; falls back to plain trending when mirrors lack mediaTrends */
  async weeklyTrending() {
    const until = Math.floor(Date.now() / 3600000) * 3600, since = until - 7 * 86400;
    const rows = `mediaTrends(date_greater: $since, date_lesser: $until, sort: TRENDING_DESC) {
      mediaId trending media { ...MediaCard } }`;

    const d = await gql(`${MEDIA_CARD}
      query Week($since: Int, $until: Int) {
        a: Page(page: 1, perPage: 50) { ${rows} }
        b: Page(page: 2, perPage: 50) { ${rows} }
      }`, { since, until }, { ttl: TTL.long, bake: 'weeklyTrending' }).catch(() => null);

    const all = d ? [...(d.a?.mediaTrends || []), ...(d.b?.mediaTrends || [])].filter(Boolean) : [];

    if (!all.length) {
      const t = await gql(`${MEDIA_CARD}
        query WeekFallback($adult: Boolean) {
          Page(page: 1, perPage: 50) {
            media(type: ANIME, sort: TRENDING_DESC, isAdult: $adult) { ...MediaCard }
          }
        }`, { adult: adultVar() }, { ttl: TTL.long });
      return t.Page.media;
    }

    const acc = new Map();
    all.forEach(t => {
      if (!t.media || (t.media.isAdult && !adultOn())) return;
      const e = acc.get(t.mediaId) || { m: t.media, sum: 0 };
      e.sum += t.trending || 0;
      acc.set(t.mediaId, e);
    });
    return [...acc.values()].sort((x, y) => y.sum - x.sum).map(e => e.m);
  },

  async random() {
    const page = 1 + Math.floor(Math.random() * 40);
    const data = await gql(
      `query R($page: Int) { Page(page: $page, perPage: 30) {
         media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { id }
       } }`, { page }, { ttl: TTL.long });
    const list = data.Page.media;
    return list[Math.floor(Math.random() * list.length)].id;
  },
};