/* Shared helpers: settings, user, header, footer, search, cards, storage */
const SITE_NAME = 'Amnestream';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const jset = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* Icons */
const ICONS = {
  home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  timeline:'<path d="M4 6h10M8 12h12M6 18h9"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  play:'<path d="M6 4l14 8-14 8z" fill="currentColor"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="M5 12l5 5 9-10"/>',
  dice:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><circle cx="12" cy="12" r="1"/>',
  link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  palette:'<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1 3.7c.6.5.3 2.3-3 2.3z"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sort:'<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  lang:'<path d="M4 5h8M8 3v2M6 5c0 4 3 7 6 8M12 5c0 4-3 7-7 8M14 20l4-10 4 10M15.5 17h5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor"/>',
  skip:'<path d="M5 4l10 8-10 8zM19 5v14"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  ghost:'<path d="M4 21V11a8 8 0 0 1 16 0v10l-3-2-2.5 2L12 19l-2.5 2L7 19z"/>',
  up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  volume:'<path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute:'<path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  prev:'<path d="M19 4L9 12l10 8zM5 5v14"/>',
  next:'<path d="M5 4l10 8-10 8zM19 5v14"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
};
const icon = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* Settings and user (all local, no backend) */
const DEFAULTS = {
  autonext: true, audio: 'sub', resume: true,
  theme: 'sakura', titleLang: 'english', epOrder: 'asc', epStyle: 'list',
  continueRow: true, reduceMotion: false, hoverTrailer: true,
  incognito: false, hideSpoilers: false, includeAdult: false,
};
const Settings = {
  get() {
    const o = jget('as_settings', {});
    if (o.includeAdult === undefined && o.showAdult !== undefined) o.includeAdult = !!o.showAdult;   // showAdult is the old setting name
    delete o.showAdult;
    return { ...DEFAULTS, ...o };
  },
  set(k, v) { const s = Settings.get(); s[k] = v; jset('as_settings', s); Settings.apply(); },
  reset() { localStorage.removeItem('as_settings'); Settings.apply(); },
  apply() {
    const s = Settings.get();
    document.documentElement.dataset.theme = s.theme === 'sakura' ? '' : s.theme;
    document.documentElement.classList.toggle('reduce-motion', !!s.reduceMotion);
  },
};
Settings.apply();
/* Turn "Show 18+ titles" on/off; turning it on asks first; returns the new value */
function setAdult(on) {
  if (on && !confirm('18+ titles can include explicit artwork and themes.\n\nShow them in Browse, search and on the home page? (You must be 18 or older.)')) return false;
  Settings.set('includeAdult', !!on);
  return !!on;
}
const scrollMode = () => Settings.get().reduceMotion ? 'auto' : 'smooth';   // Reduce motion also disables smooth scrolling
window.addEventListener('storage', e => { if (e.key === 'as_settings' || e.key === null) Settings.apply(); });   // Changed in another tab

/* Accounts use Supabase Auth (see supabase/schema.sql and js/config.js). The site asks for a username, so each username maps to a placeholder email.
   The browser keeps a cached copy of the signed-in profile in as_me so pages can read it instantly; Auth.refresh() re-checks the real session on every page load,
   so the same account works on PC and phone. The supabase-js library is only downloaded when someone has a session or opens the login popup. */
const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const EMAIL_DOMAIN = '@amnestream.app';
const Auth = {
  _me: () => jget('as_me', null),
  session() { const u = Auth._me(); return u ? { username: u.username } : null; },
  current() { return Auth._me(); },
  configured() {
    const c = window.AS_CONFIG || {};
    return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(c.supabaseUrl || '') && !!c.supabaseAnonKey && !/YOUR-/.test(c.supabaseUrl + c.supabaseAnonKey);
  },
  /* Remember me off: the session lives in sessionStorage (ends when the tab closes) instead of localStorage */
  _store: () => (localStorage.getItem('as_sb_temp') === '1' ? sessionStorage : localStorage),
  _storage: {
    getItem: k => Auth._store().getItem(k),
    setItem: (k, v) => Auth._store().setItem(k, v),
    removeItem: k => { localStorage.removeItem(k); sessionStorage.removeItem(k); },
  },
  _clientP: null,
  client() {
    if (!Auth.configured()) return Promise.reject(Object.assign(new Error('Login is not set up yet: add your Supabase URL and key in js/config.js (see README).'), { setup: true }));
    if (!Auth._clientP) {
      Auth._clientP = new Promise((res, rej) => {
        const make = () => res(window.supabase.createClient(window.AS_CONFIG.supabaseUrl, window.AS_CONFIG.supabaseAnonKey,
          { auth: { storage: Auth._storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }));
        if (window.supabase?.createClient) return make();
        const sc = document.createElement('script');
        sc.src = SB_LIB; sc.onload = make;
        sc.onerror = () => { Auth._clientP = null; rej(Object.assign(new Error('Could not reach the server. Check your connection.'), { offline: true })); };
        document.head.appendChild(sc);
      });
    }
    return Auth._clientP;
  },
  _email: username => Auth._norm(username) + EMAIL_DOMAIN,
  _norm: u => String(u || '').trim().toLowerCase(),
  _fail(e, fallback) {
    const m = String(e?.message || '');
    if (e?.offline || /fetch|network/i.test(m)) return Object.assign(new Error('Could not reach the server. Check your connection.'), { offline: true });
    if (e?.code === '23505' || /already registered|already been registered/i.test(m)) return new Error('That username is already taken');
    if (/at least \d+ char/i.test(m)) return new Error('Password must be at least 6 characters');
    if (/rate limit|too many/i.test(m)) return new Error('Too many attempts. Wait a minute and try again.');
    return new Error(e?.setup ? m : (fallback || m || 'Something went wrong'));
  },
  async _profile(sb, uid) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).single();
    if (error) throw error;
    return { username: data.username, name: data.name, bio: data.bio, avatar: data.avatar, joined: Number(data.joined) };
  },
  async register(username, password, remember = true) {
    const key = Auth._norm(username);
    if (!/^[a-z0-9_.-]{3,20}$/.test(key)) throw new Error('Username must be 3-20 characters: letters, numbers, . _ -');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    try {
      const sb = await Auth.client();
      localStorage.setItem('as_sb_temp', remember ? '0' : '1');
      const free = await sb.rpc('username_available', { u: key });
      if (free.error) throw free.error;
      if (free.data === false) throw new Error('That username is already taken');
      const { data, error } = await sb.auth.signUp({ email: Auth._email(key), password, options: { data: { username: key, name: username.trim().slice(0, 30) || key } } });
      if (error) throw error;
      if (!data.session) throw new Error('Supabase still has "Confirm email" turned on. Turn it off under Authentication > Providers > Email.');
      const user = await Auth._profile(sb, data.user.id);
      jset('as_me', user);
      return user;
    } catch (e) { throw Auth._fail(e); }
  },
  async login(username, password, remember) {
    try {
      const sb = await Auth.client();
      localStorage.setItem('as_sb_temp', remember ? '0' : '1');
      localStorage.removeItem('as_me');
      const { data: found } = await sb.rpc('email_for_username', { u: username });
      const { data, error } = await sb.auth.signInWithPassword({ email: found || Auth._email(username), password });
      if (error) throw /invalid login|invalid credentials/i.test(error.message) ? new Error('Wrong username or password') : error;
      const user = await Auth._profile(sb, data.user.id);
      jset('as_me', user);
      return user;
    } catch (e) { throw Auth._fail(e); }
  },
  /* Asks Supabase who is signed in; resolves true when the signed-in/out state changed. Offline keeps the cached state */
  async refresh() {
    const before = !!Auth._me();
    const hasSession = Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k => /^sb-.*-auth-token$/.test(k));
    if (!Auth.configured() || (!before && !hasSession)) { if (before && !Auth.configured()) localStorage.removeItem('as_me'); return before !== !!Auth._me(); }
    try {
      const sb = await Auth.client();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) localStorage.removeItem('as_me');
      else {
        const { data, error } = await sb.auth.getUser();
        if (error && [401, 403].includes(error.status)) { await sb.auth.signOut({ scope: 'local' }); localStorage.removeItem('as_me'); }
        else if (!error) jset('as_me', await Auth._profile(sb, data.user.id));
      }
    } catch { /* Offline or temporary error: keep the cached state */ }
    return before !== !!Auth._me();
  },
  /* Saves any last changes to the cloud first, then clears this browser's copy of the account's data */
  logout() {
    const synced = Auth.current() ? Promise.race([Sync.run().catch(() => false), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
    return synced.then(() => {
      if (Auth.current() && !Sync.off && !Sync._p) Sync._wipeLocal();
      localStorage.removeItem('as_me');
      return Auth.client().then(sb => sb.auth.signOut()).catch(() => {});
    });
  },
};
/* Re-check the session on load; if it flipped (signed out elsewhere, or still signed in on a fresh visit) update the page */
Auth.refresh().then(flipped => {
  if (typeof Sync !== 'undefined') Sync.start();                  // Pull this account's list and progress from the cloud
  if (!flipped) return;
  const page = location.pathname.split('/').pop();
  if (/^(profile|settings|leaderboard)\.html$/.test(page)) location.reload();
  else if (typeof buildHeader === 'function' && document.getElementById('site-header')) buildHeader();
});
document.addEventListener('visibilitychange', () => {       // Coming back to the tab/app: pick up changes made on another device
  if (document.visibilityState === 'visible') Auth.refresh().then(f => { if (f && typeof buildHeader === 'function') buildHeader(); });
});

const User = {
  /* Signed in: your account; signed out: a local Guest profile */
  get() {
    const a = Auth.current();
    if (a) return { name: a.name, username: a.username, bio: a.bio, avatar: a.avatar, joined: a.joined, account: true };
    let u = jget('as_user', null);
    if (!u) { u = { name: 'Guest', username: 'guest', bio: 'Hello, I\'m a new user of ' + SITE_NAME + '!', avatar: '', joined: Date.now() }; jset('as_user', u); }
    return u;
  },
  /* Saved locally right away, then to the server; if the server refuses (for example the username is taken) the old values come back */
  set(patch) {
    const a = Auth.current();
    if (!a) { jset('as_user', { ...User.get(), ...patch }); return Promise.resolve(); }
    const { name, bio, avatar, username } = patch;
    const clean = { name, bio, avatar, username };
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
    if (clean.username !== undefined) clean.username = Auth._norm(clean.username);
    jset('as_me', { ...a, ...clean });
    return Auth.client().then(async sb => {
      const { data: { user } } = await sb.auth.getUser();
      const { data, error } = await sb.from('profiles').update(clean).eq('id', user.id).select().single();
      if (error) throw error;
      jset('as_me', { username: data.username, name: data.name, bio: data.bio, avatar: data.avatar, joined: Number(data.joined) });
    }).catch(e => {
      const err = Auth._fail(e, /check constraint|violates/i.test(e?.message || '') ? 'Those profile details are not allowed' : undefined);
      jset('as_me', a);
      toast(err.offline ? 'Could not save: you are offline' : err.message);
      if (typeof buildHeader === 'function') buildHeader();
      const pg = location.pathname.split('/').pop();                       // Redraw with the restored values, keeping the toast on screen
      if (pg === 'settings.html' && typeof render === 'function') render();
      else if (pg === 'profile.html' && typeof paintProfile === 'function') paintProfile();
    });
  },
  logout() { return Auth.logout(); },
};
function avatarHTML(size = 34) {
  const u = User.get();
  return u.avatar
    ? `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(u.avatar)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'avatar',textContent:'${esc((u.name || 'G')[0].toUpperCase())}'}))">`
    : `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px">${esc((u.name || 'G')[0].toUpperCase())}</span>`;
}

/* Helpers */
function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function stripTags(html = '') { return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(); }
function go(page, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  location.href = page + (q ? '?' + q : '');
}

const titleOf = m => {
  const t = m?.title || {};
  return (Settings.get().titleLang === 'romaji' ? t.romaji || t.english : t.english || t.romaji) || t.native || 'Unknown title';
};
const titlesOf = m => ({ english: m?.title?.english || '', romaji: m?.title?.romaji || '' });
/* Title of a saved entry in the language chosen in Settings */
const savedTitle = x => {
  const t = x?.titles;
  if (t && (t.english || t.romaji)) return (Settings.get().titleLang === 'romaji' ? t.romaji || t.english : t.english || t.romaji);
  return x?.title || 'Unknown title';
};
const coverOf = m => m?.coverImage?.extraLarge || m?.coverImage?.large || '';
const thumbOf = m => m?.coverImage?.large || m?.coverImage?.extraLarge || m?.coverImage?.medium || '';
const bannerOf = m => m?.bannerImage || m?.coverImage?.extraLarge || '';
const scoreOf = m => (m?.averageScore ? (m.averageScore / 10).toFixed(1) : null);

const FORMAT_LABEL = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };
const fmtLabel = m => FORMAT_LABEL[m?.format] || m?.format || '';
const STATUS_LABEL = { FINISHED: 'Finished', RELEASING: 'Airing', NOT_YET_RELEASED: 'Upcoming', CANCELLED: 'Cancelled', HIATUS: 'Hiatus' };
const statusLabel = m => STATUS_LABEL[m?.status] || '';

/* Episodes that have aired and can be watched: 0 for a show that has not started (not released, or episode 1 still to come); for an airing show only what has aired, not the planned total */
function airedCount(m) {
  if (!m) return 0;
  if (m.status === 'NOT_YET_RELEASED') return 0;
  if (m.status === 'RELEASING' && m.nextAiringEpisode?.episode) return Math.max(0, m.nextAiringEpisode.episode - 1);
  if (m.episodes) return m.episodes;
  if (m.nextAiringEpisode?.episode) return Math.max(0, m.nextAiringEpisode.episode - 1);
  if (m.format === 'MOVIE' || m.format === 'MUSIC') return 1;
  return 12;
}
/* Same, but never below 1 (saved progress and episode navigation need a number) */
const epCountOf = m => (m ? Math.max(1, airedCount(m)) : 1);
function epLabel(m) {
  if (airedCount(m) === 0) return 'Soon';
  const n = epCountOf(m);
  if (m?.status === 'RELEASING') return 'Ep ' + n;
  if (m?.format === 'MOVIE') return 'Movie';
  return n + ' eps';
}
function currentSeason(d = new Date()) {
  const m = d.getMonth() + 1, y = d.getFullYear();
  return { season: m <= 3 ? 'WINTER' : m <= 6 ? 'SPRING' : m <= 9 ? 'SUMMER' : 'FALL', year: y };
}

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const Store = {
  list: () => jget('as_list', []),
  inList: id => Store.list().some(x => x.id === id),
  toggleList(m) {
    const l = Store.list();
    const i = l.findIndex(x => x.id === m.id);
    if (i > -1) l.splice(i, 1);
    else l.unshift({ id: m.id, title: titleOf(m), titles: titlesOf(m), cover: coverOf(m), format: m.format, score: m.averageScore });
    jset('as_list', l.slice(0, 500));
    Sync.touch('list');
    return i === -1;
  },
  setList(l) { jset('as_list', l.slice(0, 500)); Sync.touch('list'); },
  /* Clears progress, seen episodes and activity here and (through the stamp) on your other devices */
  clearHistory() { ['as_progress', 'as_seen', 'as_activity'].forEach(k => localStorage.removeItem(k)); Sync.touch('hist'); },
  progress: () => jget('as_progress', {}),
  seen: () => jget('as_seen', {}),
  activity: () => jget('as_activity', {}),
  saveProgress(m, ep) {
    if (Settings.get().incognito) return;
    ep = Number(ep);
    const p = Store.progress();
    p[m.id] = { id: m.id, title: titleOf(m), titles: titlesOf(m), cover: coverOf(m), ep, total: epCountOf(m), ts: Date.now() };
    jset('as_progress', p);
    Sync.later();
    const seen = Store.seen();
    const arr = seen[m.id] || [];
    if (!arr.includes(ep)) {
      arr.push(ep); seen[m.id] = arr; jset('as_seen', seen);
      const act = Store.activity(); const k = dayKey();
      act[k] = (act[k] || 0) + 1; jset('as_activity', act);
    }
  },
  /* Fetch both title languages once for entries saved with only one; resolves true if something changed */
  async fillTitles() {
    const list = Store.list(), prog = Store.progress();
    const ids = [...new Set([...list, ...Object.values(prog)].filter(x => !x.titles).map(x => x.id))].slice(0, 50);
    if (!ids.length) return false;
    try {
      const got = {};
      (await Api.titlesOf(ids)).Page.media.forEach(m => { got[m.id] = titlesOf(m); });
      let changed = false;
      list.forEach(x => { if (!x.titles && got[x.id]) { x.titles = got[x.id]; changed = true; } });
      Object.values(prog).forEach(x => { if (!x.titles && got[x.id]) { x.titles = got[x.id]; changed = true; } });
      if (changed) { jset('as_list', list); jset('as_progress', prog); }
      return changed;
    } catch { return false; }
  },
  continueList() {
    return Object.values(Store.progress()).filter(x => x.ep < x.total).sort((a, b) => b.ts - a.ts).slice(0, 24);
  },
};

/* Cloud sync: while signed in, your list, favourites, progress and watch history live in the Supabase table user_data (see supabase/sync.sql),
   so Continue watching is the same on every device. Each device merges with the cloud copy on load, on login, when you come back to the tab,
   every minute while open, and a moment after each change. Merge rules: progress keeps the newest entry per title, seen episodes and daily
   activity are combined, the list and favourites follow whichever device changed them last (so removing a title sticks), and "Clear watch
   history" wins over older data. A guest's local data is combined with the account on first login. */
/* Dub availability: neither AniList nor the player provider says whether an English dub exists, so the site learns it.
   When the player cannot start a dub on any server, that episode's DUB is remembered (7 days) and shown crossed out; it clears itself if a dub ever plays. */
const Dub = {
  _m: () => jget('as_nodub', {}),
  missing(id, ep) { const t = Dub._m()[id + ':' + ep]; return !!t && t > Date.now(); },
  mark(id, ep) {
    const m = Dub._m(), now = Date.now();
    m[id + ':' + ep] = now + 7 * 864e5;
    const keys = Object.keys(m);
    if (keys.length > 300) keys.forEach(k => { if (m[k] < now) delete m[k]; });
    jset('as_nodub', m);
  },
  clear(id, ep) { const m = Dub._m(); if (m[id + ':' + ep]) { delete m[id + ':' + ep]; jset('as_nodub', m); } },
};

const Sync = {
  _p: null, _again: false, _t: 0, _poll: 0, off: '',
  meta: () => jget('as_sync', {}),
  /* Stamp a change so merges know which device edited last; only stamped while signed in */
  touch(kind) {
    if (!Auth.current()) return;
    const m = Sync.meta(), now = Date.now();
    if (kind === 'list') m.listTs = now; else if (kind === 'fav') m.favTs = now; else if (kind === 'hist') m.histTs = now;
    jset('as_sync', m);
    Sync.later();
  },
  later(ms = 400) { if (Auth.current() && !Sync.off) { clearTimeout(Sync._t); Sync._t = setTimeout(() => Sync.run(), ms); } },
  /* Called whenever the user looks at content: syncs unless it already did a few seconds ago */
  _last: 0,
  view() { if (Date.now() - Sync._last > 6000) return Sync.run(); return Sync._p || Promise.resolve(false); },
  /* Resolves when a sync finishes or after ms, whichever is first (never blocks the page for long) */
  fresh(ms = 1500) { return Promise.race([Sync.view().catch(() => false), new Promise(r => setTimeout(r, ms))]); },
  _stable: v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x),
  _local(m) {
    return { list: jget('as_list', []), listTs: m.listTs || 0, fav: jget('as_fav', []), favTs: m.favTs || 0,
      progress: jget('as_progress', {}), seen: jget('as_seen', {}), activity: jget('as_activity', {}), histTs: m.histTs || 0 };
  },
  _norm: r => ({ list: Array.isArray(r?.list) ? r.list : [], listTs: Number(r?.listTs) || 0, fav: Array.isArray(r?.fav) ? r.fav : [], favTs: Number(r?.favTs) || 0,
    progress: r?.progress && typeof r.progress === 'object' ? r.progress : {}, seen: r?.seen && typeof r.seen === 'object' ? r.seen : {},
    activity: r?.activity && typeof r.activity === 'object' ? r.activity : {}, histTs: Number(r?.histTs) || 0 }),
  /* baseline: this device has synced with this account before, so timestamps can be trusted for list/favourites */
  merge(l, r, baseline) {
    const uniq = (arr, key) => { const s = new Set(); return arr.filter(x => { const k = key(x); if (s.has(k)) return false; s.add(k); return true; }); };
    const out = {};
    if (baseline) { const w = l.listTs >= r.listTs ? l : r; out.list = w.list; out.listTs = w.listTs; }
    else { out.list = uniq([...r.list, ...l.list].filter(x => x && x.id != null), x => x.id).slice(0, 500); out.listTs = Math.max(l.listTs, r.listTs); }
    if (baseline) { const w = l.favTs >= r.favTs ? l : r; out.fav = w.fav; out.favTs = w.favTs; }
    else { out.fav = uniq([...r.fav, ...l.fav], x => x).slice(0, 500); out.favTs = Math.max(l.favTs, r.favTs); }
    out.histTs = Math.max(l.histTs, r.histTs);
    out.progress = {};
    for (const src of [r.progress, l.progress]) for (const [id, p] of Object.entries(src)) {
      if (!p || !(p.ts > out.histTs)) continue;
      if (!out.progress[id] || p.ts > out.progress[id].ts) out.progress[id] = p;
    }
    if (l.histTs !== r.histTs) { const w = l.histTs > r.histTs ? l : r; out.seen = w.seen; out.activity = w.activity; }
    else {
      out.seen = {};
      for (const src of [r.seen, l.seen]) for (const [id, a] of Object.entries(src)) out.seen[id] = [...new Set([...(out.seen[id] || []), ...(Array.isArray(a) ? a : [])])].sort((x, y) => x - y);
      out.activity = {};
      for (const src of [r.activity, l.activity]) for (const [d, n] of Object.entries(src)) out.activity[d] = Math.max(out.activity[d] || 0, Number(n) || 0);
    }
    return out;
  },
  /* Writes merged data into localStorage; true if anything on this device changed */
  _apply(merged, local) {
    let changed = false;
    const put = (key, val, old) => { if (Sync._stable(val) !== Sync._stable(old)) { jset(key, val); changed = true; } };
    put('as_list', merged.list, local.list); put('as_fav', merged.fav, local.fav);
    put('as_progress', merged.progress, local.progress); put('as_seen', merged.seen, local.seen); put('as_activity', merged.activity, local.activity);
    return changed;
  },
  _wipeLocal() { ['as_list', 'as_fav', 'as_progress', 'as_seen', 'as_activity', 'as_sync'].forEach(k => localStorage.removeItem(k)); },
  run() {
    if (!Auth.current() || !Auth.configured() || Sync.off) return Promise.resolve(false);
    if (Sync._p) { Sync._again = true; return Sync._p; }       // One at a time; changes made meanwhile get a follow-up pass
    Sync._p = Sync._do().catch(() => false).finally(() => {
      Sync._p = null;
      if (Sync._again) { Sync._again = false; Sync.run(); }
    });
    return Sync._p;
  },
  async _do() {
    Sync._last = Date.now();
    const sb = await Auth.client();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return false;
    const uid = session.user.id;
    Sync._tok = session.access_token; Sync._uid = uid;
    let meta = Sync.meta();
    if (meta.uid && meta.uid !== uid) { Sync._wipeLocal(); meta = {}; }          // Another account used this browser: do not mix the two
    const { data: row, error } = await sb.from('user_data').select('data').eq('user_id', uid).maybeSingle();
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '')) {
        Sync.off = 'missing';
        console.warn('[Amnestream] Cloud sync is off: the "user_data" table is missing in Supabase. Run supabase/sync.sql once in the Supabase SQL editor.');
      }
      return false;
    }
    const remote = row?.data ? Sync._norm(row.data) : null;
    const local = Sync._local(meta);
    const merged = remote ? Sync.merge(local, remote, !!meta.uid && meta.uid === uid) : local;
    const changed = Sync._apply(merged, local);
    jset('as_sync', { uid, listTs: merged.listTs, favTs: merged.favTs, histTs: merged.histTs });
    Sync._sig = Sync._stable(Sync._local(Sync.meta()));
    if (!remote || Sync._stable(merged) !== Sync._stable(remote)) {
      const { error: e2 } = await sb.from('user_data').upsert({ user_id: uid, data: { v: 1, ...merged }, updated_at: new Date().toISOString() });
      if (e2) return changed;
    }
    if (changed) document.dispatchEvent(new Event('as:synced'));
    return changed;
  },
  /* Leaving the page: send unsaved changes with a keepalive request, which survives the page closing */
  flush() {
    try {
      if (!Auth.current() || Sync.off || !Sync._tok || !Sync._uid) return;
      const local = Sync._local(Sync.meta());
      if (Sync._stable(local) === Sync._sig) return;
      const c = window.AS_CONFIG;
      fetch(c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/user_data', { method: 'POST', keepalive: true,
        headers: { apikey: c.supabaseAnonKey, Authorization: 'Bearer ' + Sync._tok, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ user_id: Sync._uid, data: { v: 1, ...local }, updated_at: new Date().toISOString() }) }).catch(() => {});
      Sync._sig = Sync._stable(local);
    } catch { /* best effort */ }
  },
  /* Called once per page: first sync now, then keep the tab fresh */
  start() {
    Sync.run();
    if (Sync._poll) return;
    Sync._poll = 1;                                                  // Listeners below are added only once
    /* Pulls only happen when a page loads (open, refresh, navigate, back/forward); no polling and no tab-focus syncing.
       Pushes happen shortly after you change something, and when you leave the page. */
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Sync.flush(); });
    window.addEventListener('pagehide', () => Sync.flush());
    window.addEventListener('pageshow', e => { if (e.persisted) Sync.view(); });   // Back/forward cache restores skip a normal load
  },
};


function toast(msg, ms = 2600) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}

async function randomAnime(btn) {
  if (btn) btn.disabled = true;
  try { location.href = 'anime.html?id=' + await Api.random(); }
  catch { toast('Could not pick a random title'); if (btn) btn.disabled = false; }
}

/* Continue watching with new-episode alerts */
const Continue = {
  /* Compares last watched with what has aired since (one light, cached query) */
  async load() {
    const all = Object.values(Store.progress()).sort((a, b) => b.ts - a.ts);
    const info = {};
    if (all.length) {
      try {
        (await Api.statusOf(all.slice(0, 50).map(x => x.id))).Page.media.forEach(m => { info[m.id] = m; });
      } catch { /* Offline: fall back to stored totals */ }
    }
    return all.map(x => {
      const m = info[x.id];
      let avail = x.total;
      if (m) {
        avail = m.status === 'RELEASING'
          ? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.episodes || x.total))
          : (m.episodes || x.total);
      }
      avail = Math.max(1, avail);
      return { ...x, avail, fresh: Math.max(0, avail - x.total) };
    })
      .filter(x => x.ep < x.avail)
      .sort((a, b) => (b.fresh > 0) - (a.fresh > 0) || b.ts - a.ts)
      .slice(0, 24);
  },
  /* Instant first paint from storage before the check finishes */
  quick: () => Store.continueList().map(x => ({ ...x, avail: x.total, fresh: 0 })),
};
function continueCardHTML(x) {
  const ep = x.fresh && x.ep >= x.total ? x.ep + 1 : x.ep;     // Caught up with a new episode: open the new one
  const details = `anime.html?id=${x.id}`;
  return `
    <article class="card">
      <div class="card-media">
        <img loading="lazy" decoding="async" src="${esc(x.cover)}" alt="">
        ${x.fresh ? `<span class="badge badge-new">${x.fresh > 1 ? x.fresh + ' new episodes' : 'New episode'}</span>` : ''}
        ${hitHTML(details, savedTitle(x))}
        ${playBtnHTML(`watch.html?id=${x.id}&ep=${ep}`, `Play Ep ${ep}`)}
        <span class="card-sub">Ep ${ep} / ${x.avail || x.total}</span>
      </div>
      <a class="card-title" href="${details}">${esc(savedTitle(x))}</a>
    </article>`;
}

/* Cards */
/* Hover popup data: each poster carries a hidden JSON hook that HoverPop reads to show a preview card */
function hoverDescHTML(m) {
  if (!m?.id) return '';
  const info = {
    id: m.id, ti: [m.title?.english || '', m.title?.romaji || ''], s: scoreOf(m) || '', f: fmtLabel(m), y: m.seasonYear || '', g: (m.genres || []).slice(0, 3),
    d: stripTags(m.description || '').replace(/\s+/g, ' ').trim().slice(0, 320),
    e: epLabel(m), st: statusLabel(m), fm: m.format || '', as: m.averageScore || 0,
  };
  return `<span class="card-data" hidden data-info="${esc(JSON.stringify(info))}"></span>`;
}

/* Poster and title open Details; only the round play button opens the Player (two sibling links, never nested) */
let _progMemo = null;
const progressNow = () => _progMemo || (queueMicrotask(() => { _progMemo = null; }), (_progMemo = Store.progress()));

/* Where play goes: resume where you left off, otherwise episode 1 */
function playTarget(m) {
  const prog = progressNow()[m.id];
  if (Settings.get().resume && prog) {
    const ep = Math.max(1, Math.min(prog.ep, prog.total || prog.ep));
    return { href: `watch.html?id=${m.id}&ep=${ep}`, label: `Resume Ep ${ep}` };
  }
  return { href: `watch.html?id=${m.id}&ep=1`, label: 'Play Ep 1' };
}
const hitHTML = (href, title) =>
  `<a class="card-hit" href="${esc(href)}" aria-label="${esc(title)}" title="${esc(title)}"></a>`;
const playBtnHTML = (href, label) =>
  `<a class="card-play" href="${esc(href)}" data-label="${esc(label)}" aria-label="${esc(label)}" title="${esc(label)}">&#9654;</a>`;

function cardHTML(m) {
  if (!m) return '';
  const score = scoreOf(m), title = titleOf(m), details = `anime.html?id=${m.id}`;
  const pt = airedCount(m) === 0 ? null : playTarget(m);      // Nothing to play yet
  return `
    <article class="card">
      <div class="card-media">
        <img loading="lazy" decoding="async" src="${thumbOf(m)}" alt="${esc(title)}">
        ${score ? `<span class="badge badge-score">&#9733; ${score}</span>` : ''}
        ${m.status === 'RELEASING' ? `<span class="badge badge-air">Airing</span>` : ''}
        ${m.isAdult ? `<span class="badge badge-18">18+</span>` : ''}
        ${hitHTML(details, title)}
        ${pt ? playBtnHTML(pt.href, pt.label) : ''}
        <span class="card-tags">
          <span class="tag eps">${esc(epLabel(m))}</span>
          ${fmtLabel(m) ? `<span class="tag fmt">${esc(fmtLabel(m))}</span>` : ''}
        </span>
        ${hoverDescHTML(m)}
      </div>
      <a class="card-title" href="${details}">${esc(title)}</a>
    </article>`;
}

/* Latest-episode cards (home row, Discover, Browse > Latest episodes) */
function timeAgo(sec) {
  const d = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (d < 90) return 'just now';
  if (d < 3600) return Math.round(d / 60) + 'm ago';
  if (d < 86400) return Math.round(d / 3600) + 'h ago';
  return Math.round(d / 86400) + 'd ago';
}
let LATEST_CTX = { seen: {}, prog: {} };
function latestCardHTML({ m, ep, at }) {
  const seen = LATEST_CTX.seen[m.id] || [], prog = LATEST_CTX.prog[m.id];
  const watched = seen.includes(ep);
  let target = ep;
  if (!watched && prog && prog.ep < ep) target = seen.includes(prog.ep) ? prog.ep + 1 : prog.ep;   // Pick up where you left off
  const playHref = `watch.html?id=${m.id}&ep=${target}`, details = `anime.html?id=${m.id}`;
  return `
    <article class="card ${watched ? 'is-watched' : ''}">
      <div class="card-media">
        <img loading="lazy" decoding="async" src="${thumbOf(m)}" alt="${esc(titleOf(m))}">
        ${watched ? '<span class="badge badge-watched">&#10003; Watched</span>' : `<span class="badge badge-air">${timeAgo(at)}</span>`}
        ${target !== ep ? `<span class="badge badge-note">Up next: Ep ${target}</span>` : ''}
        ${hitHTML(details, titleOf(m))}
        ${playBtnHTML(playHref, `Play Ep ${target}`)}
        <span class="card-tags"><span class="tag eps">Episode ${ep}</span>${fmtLabel(m) ? `<span class="tag fmt">${esc(fmtLabel(m))}</span>` : ''}</span>
        ${hoverDescHTML(m)}
      </div>
      <a class="card-title" href="${details}">${esc(titleOf(m))}</a>
    </article>`;
}

/* Hover preview popup (desktop): banner, muted trailer, score, genres, synopsis and buttons; trailer fetched lazily and shown once it is really playing; positions are measured so they stay right under --zoom */
const HoverPop = (() => {
  const mq = window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:901px)');
  let layer, pop, card = null, showT, hideT, vidT, token = 0, muted = true;
  let pending = null;            // Card a popup is scheduled for
  let dismissed = null;          // Card whose popup was closed with Esc (stays closed until the pointer leaves)
  let lastX = -1, lastY = -1;    // Last pointer position, to re-check what is under it
  let probeT, scrollT;

  const readInfo = c => { try { return JSON.parse(c.querySelector('.card-data')?.dataset.info || 'null'); } catch { return null; } };

  function ensure() {
    if (pop) return;
    layer = document.createElement('div'); layer.className = 'hp-layer';
    pop = document.createElement('div'); pop.id = 'hpop'; pop.className = 'hp';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Anime preview');
    layer.appendChild(pop); document.body.appendChild(layer);
    pop.addEventListener('mouseenter', () => clearTimeout(hideT));
    pop.addEventListener('mouseleave', () => scheduleHide(220));
    pop.addEventListener('click', e => {
      const mb = e.target.closest('.hp-mute'), lb = e.target.closest('.hp-list');
      if (mb) toggleMute(mb);
      if (lb) toggleList(lb);
    });
  }

  function html(c, info) {
    const img = c.querySelector('img'), cover = img?.currentSrc || img?.src || '';
    const title = c.querySelector('.card-title')?.textContent.trim() || '';
    // The card's play button already knows where to go
    const pb = c.querySelector('a.card-play');
    const fb = playTarget({ id: info.id });
    const play = pb?.getAttribute('href') || fb.href, label = pb?.dataset.label || fb.label;
    const upcoming = info.st === 'Upcoming';
    const bits = [info.s && `<b>&#9733; ${esc(info.s)}</b>`, info.f && esc(info.f), info.y, info.e && esc(info.e), info.st && esc(info.st)].filter(Boolean);
    const inList = Store.inList(info.id);
    return `<div class="hp-in">
      <div class="hp-media">
        <img class="hp-art" src="${esc(cover)}" alt="">
        <div class="hp-video"></div>
        <button class="hp-mute" type="button" hidden aria-label="Unmute trailer" title="Unmute">${icon('mute', 15)}</button>
      </div>
      <div class="hp-body">
        <h3 class="hp-title">${esc(title)}</h3>
        <div class="hp-meta">${bits.join('<i>&middot;</i>')}</div>
        ${info.g?.length ? `<div class="hp-genres">${info.g.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
        ${info.d ? `<p class="hp-desc">${esc(info.d)}</p>` : ''}
        <div class="hp-actions">
          ${upcoming ? '' : `<a class="hp-play" href="${esc(play)}">${icon('play', 13)} ${esc(label)}</a>`}
          <button class="hp-btn hp-list ${inList ? 'on' : ''}" type="button" title="${inList ? 'In My List' : 'Add to My List'}" aria-label="My List" data-t="${esc(title)}" data-c="${esc(cover)}">${icon(inList ? 'check' : 'plus', 16)}</button>
          <a class="hp-btn ${upcoming ? 'wide' : ''}" href="anime.html?id=${info.id}" title="Details" aria-label="Details">${icon('info', 16)}${upcoming ? ' <span>Details</span>' : ''}</a>
        </div>
      </div>
    </div>`;
  }

  /* Place the popup beside the poster (flip left if no room), centred and clamped */
  function place(c) {
    const r = c.getBoundingClientRect(), vp = layer.getBoundingClientRect(), M = 12, GAP = 10;
    pop.style.left = '0px'; pop.style.top = '0px';
    const a = pop.getBoundingClientRect();
    pop.style.left = '100px'; pop.style.top = '100px';
    const b = pop.getBoundingClientRect();
    const kx = (b.left - a.left) / 100 || 1, ky = (b.top - a.top) / 100 || 1;     // Style px to measured px (zoom)
    const w = a.width, h = a.height;
    const right = r.right + GAP + w <= vp.right - M;
    let x = right ? r.right + GAP : r.left - GAP - w;
    x = Math.max(vp.left + M, Math.min(x, vp.right - w - M));
    const y = Math.max(vp.top + M, Math.min(r.top + r.height / 2 - h / 2, vp.bottom - h - M));
    pop.classList.toggle('side-l', !right);
    pop.style.left = (x - a.left) / kx + 'px';
    pop.style.top = (y - a.top) / ky + 'px';
  }

  function show(c) {
    if (!mq.matches) return;
    if (!c.isConnected) { probe(); return; }            // Row re-rendered meanwhile: check what is under the pointer now
    const info = readInfo(c);
    if (!info) return;
    ensure();
    killVideo();
    card = c; muted = true;
    const tk = ++token;
    pop.className = 'hp';
    pop.innerHTML = html(c, info);
    place(c);
    requestAnimationFrame(() => { if (tk === token) pop.classList.add('on'); });
    lazyTrailer(info.id, tk, !Settings.get().hoverTrailer || Settings.get().reduceMotion);   // artOnly: still upgrade the poster to the banner
  }

  async function lazyTrailer(id, tk, artOnly) {
    let m;
    try { m = (await Api.preview(id)).Media; } catch { return; }
    if (tk !== token || !m) return;
    if (m.bannerImage) {
      const art = $('.hp-art', pop);
      if (art && art.src !== m.bannerImage) {
        const n = new Image();
        n.onload = () => { if (tk === token && art.isConnected) { art.src = m.bannerImage; art.classList.add('banner'); } };
        n.src = m.bannerImage;
      }
    }
    if (artOnly || !m.trailer?.id) return;
    vidT = setTimeout(() => { if (tk === token) mountVideo(m.trailer, tk); }, 250);
  }

  function mountVideo(t, tk) {
    const host = $('.hp-video', pop);
    if (!host) return;
    const yt = t.site === 'youtube';
    const origin = /^https?:$/.test(location.protocol) ? '&origin=' + encodeURIComponent(location.origin) : '';
    const src = yt
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(t.id)}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&playsinline=1&rel=0&loop=1&playlist=${encodeURIComponent(t.id)}&enablejsapi=1${origin}`
      : t.site === 'dailymotion' ? `https://www.dailymotion.com/embed/video/${encodeURIComponent(t.id)}?autoplay=1&mute=1&controls=0&sharing-enable=false&ui-logo=0` : '';
    if (!src) return;
    const f = document.createElement('iframe');
    f.title = 'Trailer preview'; f.tabIndex = -1; f.allow = 'autoplay; encrypted-media'; f.referrerPolicy = 'strict-origin-when-cross-origin';
    let heard = false;
    const reveal = () => { if (tk !== token) return; pop.classList.add('playing'); if (yt) $('.hp-mute', pop)?.removeAttribute('hidden'); };
    const onMsg = e => {
      if (e.source !== f.contentWindow) return;
      heard = true;
      let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d) return;
      if (d.event === 'onError') { f.remove(); window.removeEventListener('message', onMsg); return; }     // Embedding disabled etc.: keep the banner
      const st = d.event === 'onStateChange' ? d.info : d.info?.playerState;
      if (st === 1) reveal();
    };
    window.addEventListener('message', onMsg);
    f._off = () => window.removeEventListener('message', onMsg);
    f.addEventListener('load', () => {
      if (yt) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch { /* ignore */ } }
      setTimeout(() => { if (!heard && f.isConnected) reveal(); }, yt ? 3200 : 1500);    // No handshake: assume it is playing
    });
    f.src = src;
    host.appendChild(f);
  }

  function toggleMute(btn) {
    const f = $('.hp-video iframe', pop); if (!f) return;
    muted = !muted;
    const cmd = (func, args = []) => f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    try { if (muted) cmd('mute'); else { cmd('unMute'); cmd('setVolume', [60]); } } catch { /* ignore */ }
    btn.innerHTML = icon(muted ? 'mute' : 'volume', 15);
    btn.title = muted ? 'Unmute' : 'Mute'; btn.setAttribute('aria-label', btn.title + ' trailer');
  }

  function toggleList(btn) {
    const info = card && readInfo(card); if (!info) return;
    const t = btn.dataset.t, cv = btn.dataset.c;
    const added = Store.toggleList({ id: info.id, title: { english: info.ti?.[0] || t, romaji: info.ti?.[1] || t }, coverImage: { extraLarge: cv, large: cv }, format: info.fm, averageScore: info.as });
    btn.classList.toggle('on', added);
    btn.innerHTML = icon(added ? 'check' : 'plus', 16);
    btn.title = added ? 'In My List' : 'Add to My List';
    toast(added ? 'Added to your list' : 'Removed from your list');
  }

  function killVideo() {
    clearTimeout(vidT);
    const f = pop && $('.hp-video iframe', pop);
    if (f) { f._off?.(); f.src = 'about:blank'; f.remove(); }                       // Stops the sound immediately
  }

  function cancelShow() { clearTimeout(showT); pending = null; }

  function hide() {
    cancelShow(); clearTimeout(hideT);
    token++; card = null;
    if (!pop) return;
    killVideo();
    pop.classList.remove('on', 'playing');
    const p = pop; clearTimeout(p._d);
    p._d = setTimeout(() => { if (!card) p.innerHTML = ''; }, 200);
  }
  const scheduleHide = ms => { clearTimeout(hideT); hideT = setTimeout(hide, ms); };

  /* Open the popup after a short hover-intent delay (fly-bys do nothing) */
  function intend(c) {
    clearTimeout(hideT);
    if (c === card) { cancelShow(); return; }          // Already showing it
    if (c === pending || c === dismissed) return;      // Already scheduled or closed on purpose
    clearTimeout(showT); pending = c;
    showT = setTimeout(() => { pending = null; show(c); }, card ? 100 : 260);
  }

  /* React to whatever element the pointer is over */
  function pointerOver(el) {
    if (!(el instanceof Element)) return;
    if (el.closest('#hpop')) { clearTimeout(hideT); return; }
    const c = el.closest('.card');
    if (c && c.querySelector('.card-data')) { intend(c); return; }
    dismissed = null;
    cancelShow();
    if (card) scheduleHide(200);
  }

  /* Re-check what is under a motionless pointer (no mouseover fires after inertial scroll or re-render) */
  function probe() {
    if (!mq.matches || lastX < 0) return;
    if (card && !card.isConnected) hide();
    pointerOver(document.elementFromPoint(lastX, lastY));
  }
  const probeSoon = (ms = 120) => { clearTimeout(probeT); probeT = setTimeout(probe, ms); };

  document.addEventListener('mouseover', e => {
    lastX = e.clientX; lastY = e.clientY;
    if (!mq.matches) return;
    if (dismissed && !e.target.closest?.('.card')?.isSameNode(dismissed)) dismissed = null;
    pointerOver(e.target);
  });
  // mouseover is not re-sent if the first attempt was cancelled on the same poster,
  // so a move over a poster with nothing open or pending restarts the intent
  document.addEventListener('mousemove', e => {
    lastX = e.clientX; lastY = e.clientY;
    if (card || pending || !mq.matches) return;
    const c = e.target instanceof Element ? e.target.closest('.card') : null;
    if (c && c !== dismissed && c.querySelector('.card-data')) intend(c);
  }, { passive: true });
  document.addEventListener('mouseout', e => {
    if (e.relatedTarget) return;
    lastX = lastY = -1; dismissed = null; cancelShow();             // Pointer left the window
    if (card) scheduleHide(250);
  });

  // A scroll moves posters under the pointer: close what is open, re-check when scrolling settles
  window.addEventListener('scroll', e => {
    const t = e.target, rel = t === document || (t instanceof Element && card && t.contains(card));
    if (card && rel) hide(); else if (pending && rel) cancelShow();
    clearTimeout(scrollT); scrollT = setTimeout(probe, 140);
  }, { passive: true, capture: true });

  // Rows re-render as data arrives; a new poster may sit under a resting pointer
  if ('MutationObserver' in window) {
    new MutationObserver(ms => {
      if (lastX < 0 || ms.every(m => m.target instanceof Element && m.target.closest('.hp-layer'))) return;
      probeSoon(140);
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('blur', hide);
  window.addEventListener('resize', hide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { dismissed = card || pending; hide(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  return { hide, probe: probeSoon };
})();

function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => `<div class="card"><div class="sk sk-poster"></div><div class="sk sk-line"></div></div>`).join('');
}

function renderRail(root, title, items, { badge, href, hrefLabel = 'View all \u2192', card = cardHTML, skeleton = false } = {}) {
  const el = typeof root === 'string' ? $(root) : root;
  if (!el) return;
  el.innerHTML = `
    <div class="rail-head">
      <h2>${badge ? `<span class="pill">${esc(badge)}</span>` : ''}${esc(title)}</h2>
      ${href ? `<a class="rail-link" href="${href}">${esc(hrefLabel)}</a>` : ''}
    </div>
    <div class="rail-wrap">
      <button class="rail-nav left" aria-label="Scroll left">&lsaquo;</button>
      <div class="rail-track">${skeleton ? skeletonCards(8) : items.map(card).join('')}</div>
      <button class="rail-nav right" aria-label="Scroll right">&rsaquo;</button>
    </div>`;
  const track = $('.rail-track', el);
  const step = () => track.clientWidth * 0.85;
  $('.rail-nav.left', el).onclick  = () => track.scrollBy({ left: -step(), behavior: scrollMode() });
  $('.rail-nav.right', el).onclick = () => track.scrollBy({ left:  step(), behavior: scrollMode() });
}

function gridHTML(items, emptyMsg = 'Nothing here yet.') {
  if (!items || !items.length) return `<p class="empty">${esc(emptyMsg)}</p>`;
  return `<div class="grid">${items.map(cardHTML).join('')}</div>`;
}

const GENRES = ['Action','Adventure','Boys Love','Comedy','Drama','Ecchi','Erotica',
  'Fantasy','Girls Love','Gourmet','Hentai','Horror','Isekai','Josei','Kids','Magic','Mahou Shoujo','Mecha','Military',
  'Mystery','Music','Psychological','Romance','Samurai','School','Sci-Fi','Seinen','Shoujo','Shounen','Slice of Life',
  'Space','Sports','Supernatural','Thriller','Vampire'];
const ADULT_GENRES = ['Hentai', 'Erotica'];                      // Explicit by definition: only offered while "Show 18+ titles" is on
const visibleGenres = () => Settings.get().includeAdult ? GENRES : GENRES.filter(g => !ADULT_GENRES.includes(g));

/* Header */
function buildHeader() {
  const host = $('#site-header');
  if (!host) return;
  host.className = 'site-header';
  const page = location.pathname.split('/').pop() || 'index.html';
  const NAV = [
    ['index.html', 'home', 'Home'], ['browse.html', 'compass', 'Browse'],
    ['timeline.html', 'timeline', 'Timeline'], ['mylist.html', 'list', 'My List'],
  ];
  const u = User.get(), signedIn = !!Auth.session();
  host.innerHTML = `
    <div class="container header-inner">
      <div class="nav-pill">
        <button class="nav-burger" aria-label="Menu">&#9776;</button>
        <a class="logo" href="index.html" aria-label="${SITE_NAME}">AMNE<b>STREAM</b></a>
        <nav class="main-nav">
          ${NAV.map(([h, i, l]) => `<a class="${page === h ? 'on' : ''}" href="${h}">${icon(i, 15)}<span>${l}</span></a>`).join('')}
        </nav>
      </div>
      <div class="header-right">
        <button class="icon-btn" id="search-btn" aria-label="Search" title="Search ( / )">${icon('search', 17)}</button>
        <div class="user-wrap">
          <button class="avatar-btn" id="user-btn" aria-label="Account menu" aria-haspopup="true">${avatarHTML(36)}</button>
          <div class="user-menu" id="user-menu">
            <div class="um-head"><strong>${esc(u.name)}</strong><span>${signedIn ? '@' + esc(u.username) : 'Not logged in'}</span></div>
            ${signedIn ? '' : `<button class="um-login" id="menu-login-btn">${icon('user')}Log in / Sign up</button>`}
            <a href="profile.html">${icon('user')}Profile</a>
            <a href="settings.html">${icon('gear')}Settings</a>
            ${signedIn ? `<button id="logout-btn">${icon('logout')}Logout</button>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="search-pop" id="search-pop">
      <input id="search-input" type="search" placeholder="Search anime..." autocomplete="off" aria-label="Search anime">
      <div id="search-suggest" class="suggest"></div>
    </div>`;
  wireHeader();
}

let _headerWired = false;
function wireHeader() {
  const host = $('#site-header');
  const onScroll = () => host.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  const first = !_headerWired; _headerWired = true;
  if (first) window.addEventListener('scroll', onScroll, { passive: true });

  const pop = $('#search-pop'), input = $('#search-input'), box = $('#search-suggest');
  const menu = $('#user-menu');
  const closeAll = () => { pop.classList.remove('open'); box.classList.remove('open'); menu.classList.remove('open'); };

  $('#search-btn').onclick = e => {
    e.stopPropagation(); menu.classList.remove('open');
    pop.classList.toggle('open');
    if (pop.classList.contains('open')) input.focus();
  };
  $('#user-btn').onclick = e => { e.stopPropagation(); pop.classList.remove('open'); menu.classList.toggle('open'); };
  if ($('#logout-btn')) $('#logout-btn').onclick = () => { toast('Logging out...'); User.logout().finally(() => { toast('Logged out'); setTimeout(() => location.href = 'index.html', 400); }); };
  if ($('#menu-login-btn')) $('#menu-login-btn').onclick = () => { closeAll(); openAuth('login'); };
  if (first) {
    document.addEventListener('click', e => { if (!e.target.closest('.search-pop, .user-wrap')) $$('.search-pop,.suggest,.user-menu').forEach(x => x.classList.remove('open')); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') $$('.search-pop,.suggest,.user-menu').forEach(x => x.classList.remove('open'));
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !$('.auth-bg')) { e.preventDefault(); $('#search-btn').click(); }
    });
  }

  let ctrl = null, lastQ = '', idx = -1;
  const render = (items, q) => {
    idx = -1;
    box.innerHTML = items.length
      ? items.map(m => `
          <a class="suggest-item" href="anime.html?id=${m.id}">
            <img decoding="async" src="${m.coverImage?.medium || ''}" alt="">
            <span><strong>${esc(titleOf(m))}</strong>
            <em>${m.isAdult ? '18+ &middot; ' : ''}${esc(fmtLabel(m))}${scoreOf(m) ? ' &middot; \u2605 ' + scoreOf(m) : ''}</em></span>
          </a>`).join('') +
        `<a class="suggest-all" href="browse.html?q=${encodeURIComponent(q)}">See all results for "${esc(q)}"</a>`
      : `<div class="suggest-empty">No matches</div>`;
    box.classList.add('open');
  };
  const run = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { if (ctrl) ctrl.abort(); lastQ = ''; box.classList.remove('open'); return; }
    if (q === lastQ) return;
    lastQ = q;
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    try {
      render((await Api.search(q, 10, { signal: ctrl.signal })).Page.media, q);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      lastQ = '';                                                                  // Let the same text be searched again
      box.innerHTML = '<div class="suggest-empty">Search failed. Try again in a moment.</div>'; box.classList.add('open');
    }
  }, 140);
  input.addEventListener('input', run);
  const rows = () => $$('.suggest-item, .suggest-all', box);
  const setActive = i => {
    const l = rows(); l.forEach(x => x.classList.remove('active'));
    idx = i;
    if (l[idx]) { l[idx].classList.add('active'); l[idx].scrollIntoView({ block: 'nearest' }); }
  };
  input.addEventListener('keydown', e => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && box.classList.contains('open')) {
      e.preventDefault();
      const n = rows().length, down = e.key === 'ArrowDown';
      if (n) setActive(idx < 0 ? (down ? 0 : n - 1) : (idx + (down ? 1 : -1) + n) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = rows()[idx];
      if (picked) location.href = picked.href;
      else go('browse.html', { q: input.value.trim() });
    }
  });
  $('.nav-burger').onclick = () => document.body.classList.toggle('nav-open');
}


/* Login / register popup */
function openAuth(mode = 'login') {
  if ($('.auth-bg')) return;
  const bg = document.createElement('div');
  bg.className = 'auth-bg';
  bg.innerHTML = `
    <div class="auth-box" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button class="auth-x" type="button" aria-label="Close">${icon('close', 16)}</button>
      <div class="auth-logo">AMNE<b>STREAM</b></div>
      <div class="auth-tabs" role="tablist">
        <button type="button" role="tab" data-m="login">Log in</button>
        <button type="button" role="tab" data-m="register">Register</button>
      </div>
      <h2 id="auth-title"></h2>
      <form class="auth-form" novalidate>
        <label>Username<input id="au-user" autocomplete="username" maxlength="20" required></label>
        <label>Password<input id="au-pass" type="password" required></label>
        <label class="au-only-reg">Confirm password<input id="au-pass2" type="password" autocomplete="new-password" required></label>
        <label class="auth-remember au-only-login"><input type="checkbox" id="au-rem"><span class="au-switch"></span>Remember me</label>
        <p class="auth-err" id="au-err" role="alert"></p>
        <button class="btn btn-primary auth-go" type="submit" id="au-go"></button>
      </form>
      <p class="auth-alt" id="au-alt"></p>
    </div>`;
  document.body.appendChild(bg);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => bg.classList.add('on'));

  let m = mode;
  const box = $('.auth-box', bg), err = $('#au-err', bg), user = $('#au-user', bg), pass = $('#au-pass', bg);
  const close = () => {
    bg.classList.remove('on'); document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => bg.remove(), 200);
  };
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {                                                  // Keep focus inside the popup
      const f = $$('button:not([disabled]),input', box).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  $('.auth-x', bg).onclick = close;

  const paint = () => {
    const reg = m === 'register';
    box.dataset.mode = m; err.textContent = '';
    $$('.auth-tabs button', bg).forEach(b => { const on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('#auth-title', bg).textContent = reg ? 'Create your account' : 'Welcome back';
    $('#au-go', bg).textContent = reg ? 'Create account' : 'Log in';
    pass.autocomplete = reg ? 'new-password' : 'current-password';
    $('#au-alt', bg).innerHTML = reg
      ? 'Already have an account? <button type="button" data-m="login">Log in</button>'
      : 'New here? <button type="button" data-m="register">Create an account</button>';
    $$('[data-m]', bg).forEach(b => b.onclick = () => { if (m !== b.dataset.m) { m = b.dataset.m; paint(); user.focus(); } });
  };
  paint();
  setTimeout(() => user.focus(), 60);

  $('.auth-form', bg).onsubmit = async e => {
    e.preventDefault();
    const go = $('#au-go', bg), name = user.value.trim(), pw = pass.value;
    err.textContent = '';
    if (!name || !pw) { err.textContent = 'Enter a username and password'; return; }
    if (m === 'register' && pw !== $('#au-pass2', bg).value) { err.textContent = 'Passwords do not match'; return; }
    go.disabled = true;
    try {
      const acc = m === 'register' ? await Auth.register(name, pw, true) : await Auth.login(name, pw, $('#au-rem', bg).checked);
      close();
      toast(m === 'register' ? `Welcome to ${SITE_NAME}, ${acc.name}!` : `Welcome back, ${acc.name}!`);
      Sync.start();                                                                                          // Bring this account's list and progress onto this device
      const page = location.pathname.split('/').pop();
      if (/^(profile|settings|leaderboard)\.html$/.test(page)) setTimeout(() => location.reload(), 400);   // These pages paint your account once
      else buildHeader();
    } catch (ex) {
      err.textContent = ex.message || 'Something went wrong';
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      go.disabled = false;
    }
  };
}

/* Fade-in on scroll: Reveal.watch(container, selector) fades items in as they enter view; off with Reduce motion */
const Reveal = (() => {
  const off = () => !('IntersectionObserver' in window) || Settings.get().reduceMotion || matchMedia('(prefers-reduced-motion:reduce)').matches;
  let io;
  const obs = () => io || (io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el);
      el.classList.add('rv-in');
      setTimeout(() => el.classList.remove('rv', 'rv-in'), 650);                // Hand the element back to its normal hover styles
    });
  }, { rootMargin: '0px 0px 120px 0px', threshold: 0 }));
  return {
    watch(root, sel) {
      if (off() || !root) return;
      const o = obs();
      const items = $$(sel, root);
      items.forEach((el, i) => { el.style.setProperty('--rv-d', Math.min(i % 8, 7) * 45 + 'ms'); el.classList.add('rv'); o.observe(el); });
      // Safety net: anything on screen after a moment must be visible
      setTimeout(() => items.forEach(el => {
        if (el.classList.contains('rv') && !el.classList.contains('rv-in') && el.getBoundingClientRect().top < innerHeight + 120) { o.unobserve(el); el.classList.remove('rv'); }
      }), 1500);
    },
  };
})();

/* Page title block slowly fades on scroll */
function wireHeadFade() {
  const head = $('.page-head');
  if (!head || Settings.get().reduceMotion || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  let queued = false;
  const tick = () => {
    queued = false;
    const k = Math.min(1, Math.max(0, window.scrollY / 220));
    head.style.opacity = String(1 - k * 0.85);
    head.style.transform = `translateY(${-k * 10}px)`;
  };
  tick();
  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
}

function buildFooter() {
  const f = $('#site-footer');
  if (!f) return;
  f.className = 'site-footer';
  f.innerHTML = `
    <div class="container footer-inner">
      <div>
        <p class="footer-brand">AMNE<b>STREAM</b></p>
      </div>
    </div>
    <p class="footer-note muted">Amnestream doesn't host any files; it only shows content from third-party providers.</p>`;
}

function skeletonGrid(n = 12) {
  return `<div class="grid">${Array.from({ length: n },
    () => `<div class="card"><div class="sk sk-poster"></div><div class="sk sk-line"></div></div>`).join('')}</div>`;
}

function buildBackToTop() {
  const b = document.createElement('button');
  b.className = 'to-top'; b.setAttribute('aria-label', 'Back to top'); b.title = 'Back to top';
  b.innerHTML = icon('up', 20);
  b.onclick = () => window.scrollTo({ top: 0, behavior: scrollMode() });
  document.body.appendChild(b);
  const onScroll = () => b.classList.toggle('show', window.scrollY > 900);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
}

/* Installable app and offline shell (needs http/https; skipped on file://) */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

document.addEventListener('DOMContentLoaded', () => {
  buildHeader(); buildFooter(); buildBackToTop();
  if (document.body.classList.contains('home')) Reveal.watch(document, '.rail, .block, .side-card');   // Home sections fade in on scroll
});
