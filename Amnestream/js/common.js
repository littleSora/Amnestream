const SITE_NAME = 'Amnestream';
const BIO_MAX = 28;
/* A saved bio as the edit boxes show it: the old long default becomes the short one, anything else is cut to the limit */
const bioFit = b => { b = String(b || ''); if (b === "Hello, I'm a new user of " + SITE_NAME + '!') b = 'New to ' + SITE_NAME; return b.slice(0, BIO_MAX); };

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
/* Disposable caches (episode art, plans) share localStorage's ~5 MB with your history. When it is full, drop them so saving your progress never fails */
function freeSpace() {
  try { Object.keys(localStorage).filter(k => k.startsWith('as_epart:') || k.startsWith('as_plan:')).forEach(k => localStorage.removeItem(k)); } catch { }
}
const jset = (k, v) => {
  const raw = JSON.stringify(v);
  try { localStorage.setItem(k, raw); }
  catch (e) { freeSpace(); localStorage.setItem(k, raw); }       // Still full: let the caller see the error
};

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
Object.assign(ICONS, {
  cloud: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 8v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 1 0-8V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 5v14" stroke-dasharray="2 2"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
});
const icon = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const THEME_IDS = ['sakura', 'retro96', 'cyberpunk', 'rgb', 'wave', 'voxel', 'vapor', 'terminal', 'blueprint', 'parchment', 'blossom', 'blossom-night', 'brutal', 'frost', 'noir', 'aurora', 'magma', 'galaxy', 'photo', 'pre-rich', 'pre-oxford', 'pre-charcoal', 'pre-brunswick', 'pre-violet', 'pre-cosmos', 'pre-jet', 'pre-alabaster'];
const THEME_FONTS = { cyberpunk: 'Orbitron:wght@600;800', voxel: 'VT323', terminal: 'JetBrains+Mono:wght@400;700', blueprint: 'IBM+Plex+Mono:wght@400;600',
  parchment: 'Playfair+Display:ital,wght@0,700;1,700', noir: 'Playfair+Display:ital,wght@0,700;1,700', brutal: 'Space+Grotesk:wght@400;700' };

const Photo = {
  get() { try { return localStorage.getItem('as_photo') || ''; } catch { return ''; } },
  acc() { try { return localStorage.getItem('as_photo_acc') || ''; } catch { return ''; } },
  clear() { try { localStorage.removeItem('as_photo'); localStorage.removeItem('as_photo_acc'); } catch { } },
  async save(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('That picture could not be read.')); i.src = url; });
      const draw = (max, q) => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', q);
      };
      const t = document.createElement('canvas'); t.width = t.height = 24;
      const tx = t.getContext('2d'); tx.drawImage(img, 0, 0, 24, 24);
      const d = tx.getImageData(0, 0, 24, 24).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const w = 1 + (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 64; r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w; }
      r /= n; g /= n; b /= n;
      const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255; let h = 0;
      if (mx !== mn) { const dl = mx - mn; h = mx === r / 255 ? ((g - b) / 255 / dl) % 6 : mx === g / 255 ? (b - r) / 255 / dl + 2 : (r - g) / 255 / dl + 4; h = (h * 60 + 360) % 360; }
      const acc = `hsl(${Math.round(h)} 85% 68%)`;
      let last;
      for (const [max, q] of [[1920, .82], [1440, .72], [1000, .65]]) {
        try { const data = draw(max, q); localStorage.setItem('as_photo', data); localStorage.setItem('as_photo_acc', acc); return; } catch (e) { last = e; }
      }
      throw new Error('This device has no room to keep that picture. Try a smaller one.');
    } finally { URL.revokeObjectURL(url); }
  },
};
const DEFAULTS = {
  autonext: true, audio: 'sub', resume: true,
  theme: 'sakura', titleLang: 'english', epOrder: 'asc', epStyle: 'list',
  continueRow: true, reduceMotion: false, hoverTrailer: true,
  incognito: false, hideSpoilers: false, includeAdult: false,
  showComments: false, malAuto: true,
  uiMode: 'modern', accent: '', cardSize: 'normal',
};
/* The Wave theme's living water is a canvas in js/wave.js, loaded only while that theme is on */
function waveSync(th) {
  if (th !== 'wave') { if (window.AsWave) AsWave.stop(); return; }
  if (window.AsWave) { AsWave.start(); return; }
  if (document.getElementById('as-wave-js')) return;
  const sc = document.createElement('script');
  sc.id = 'as-wave-js'; sc.src = 'js/wave.js';
  sc.onload = () => { if (document.documentElement.dataset.theme === 'wave') AsWave.start(); };
  document.head.appendChild(sc);
}
const SCENE_OF = { galaxy: 'galaxy', vapor: 'vapor', blossom: 'sakura', 'blossom-night': 'sakura-night', aurora: 'aurora' };
const LEGACY_THEMES = { void: 'galaxy', pealcd: 'blossom' };
function sceneSync(th) {
  const sc = SCENE_OF[th];
  if (!sc) { if (window.AsScene) AsScene.stop(); return; }
  if (window.AsScene) { AsScene.start(sc); return; }
  if (document.getElementById('as-scene-js')) return;
  const el = document.createElement('script');
  el.id = 'as-scene-js'; el.src = 'js/scenes.js';
  el.onload = () => { const now = SCENE_OF[document.documentElement.dataset.theme]; if (now) AsScene.start(now); };
  document.head.appendChild(el);
}
/* The Voxel theme's ground (grass, stone and random ores) is drawn by js/voxel.js, loaded only while that theme is on */
function voxelSync(th) {
  if (th !== 'voxel') { if (window.AsVoxel) AsVoxel.stop(); return; }
  if (window.AsVoxel) { AsVoxel.start(); return; }
  if (document.getElementById('as-voxel-js')) return;
  const el = document.createElement('script');
  el.id = 'as-voxel-js'; el.src = 'js/voxel.js';
  el.onload = () => { if (document.documentElement.dataset.theme === 'voxel') AsVoxel.start(); };
  document.head.appendChild(el);
}
const Settings = {
  get() {
    const o = jget('as_settings', {});
    if (LEGACY_THEMES[o.theme]) o.theme = LEGACY_THEMES[o.theme];
    if (o.includeAdult === undefined && o.showAdult !== undefined) o.includeAdult = !!o.showAdult;
    delete o.showAdult;
    return { ...DEFAULTS, ...o };
  },
  set(k, v) {
    const s = Settings.get();
    if (k === 'theme' && s.theme !== v) { try { localStorage.setItem('as_theme_t0', String(Date.now())); } catch { } }
    s[k] = v; jset('as_settings', s); Settings.apply();
  },
  reset() { localStorage.removeItem('as_settings'); Settings.apply(); },
  apply() {
    const s = Settings.get();
    const th = !THEME_IDS.includes(s.theme) || s.theme === 'sakura' || (s.theme === 'photo' && !Photo.get()) ? '' : s.theme;
    document.documentElement.dataset.theme = th;
    { const r = document.documentElement, first = Settings._th === undefined;
      if (first || Settings._th !== th) {
        const now = Date.now(); let t0 = 0; try { t0 = +localStorage.getItem('as_theme_t0') || 0; } catch { }
        r.style.setProperty('--clk', (now / 1000).toFixed(3));
        r.style.setProperty('--since', t0 ? Math.max(0, (now - t0) / 1000).toFixed(2) : '99');
        Settings._th = th;
      } }
    let fl = document.getElementById('as-theme-font');
    if (THEME_FONTS[th]) { if (!fl) { fl = document.createElement('link'); fl.id = 'as-theme-font'; fl.rel = 'stylesheet'; document.head.appendChild(fl); } const u = `https://fonts.googleapis.com/css2?family=${THEME_FONTS[th]}&display=swap`; if (fl.href !== u) fl.href = u; }
    else if (fl) fl.remove();
    let ps = document.getElementById('as-photo-css');
    if (th === 'photo') {
      const pic = Photo.get(), a = Photo.acc();
      if (!ps) { ps = document.createElement('style'); ps.id = 'as-photo-css'; document.head.appendChild(ps); }
      const css = `html[data-theme=photo]{--photo:url("${pic}");${a ? `--accent:${a};--accent-ink:#0b0b12;` : ''}}`;
      if (ps.textContent !== css) ps.textContent = css;
    } else if (ps) ps.remove();
    document.documentElement.classList.toggle('reduce-motion', !!s.reduceMotion);
    waveSync(th);
    sceneSync(th);
    voxelSync(th);
    const root = document.documentElement;
    root.dataset.ui = s.uiMode === 'classic' ? 'classic' : 'modern';
    root.dataset.cards = ['small', 'large'].includes(s.cardSize) ? s.cardSize : 'normal';
    if (th !== 'rgb' && /^#[0-9a-f]{6}$/i.test(s.accent || '')) {
      const n = parseInt(s.accent.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      root.style.setProperty('--accent', s.accent);
      root.style.setProperty('--accent-ink', lum > 0.58 ? '#0b0d14' : '#ffffff');
    } else { root.style.removeProperty('--accent'); root.style.removeProperty('--accent-ink'); }
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
window.addEventListener('storage', e => { if (e.key === 'as_settings' || e.key === null) Settings.apply(); });

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
    } catch { }
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
Auth.refresh().then(flipped => {
  if (typeof Sync !== 'undefined') Sync.start();
  if (!flipped) return;
  const page = location.pathname.split('/').pop();
  if (/^(profile|settings|leaderboard)\.html$/.test(page)) location.reload();
  else if (typeof buildHeader === 'function' && document.getElementById('site-header')) buildHeader();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') Auth.refresh().then(f => { if (f && typeof buildHeader === 'function') buildHeader(); });
});

const User = {
  /* Signed in: your account; signed out: a local Guest profile */
  get() {
    const a = Auth.current();
    if (a) return { name: a.name, username: a.username, bio: a.bio, avatar: a.avatar, joined: a.joined, account: true };
    let u = jget('as_user', null);
    if (!u) { u = { name: 'Guest', username: 'guest', bio: 'New to ' + SITE_NAME, avatar: '', joined: Date.now() }; jset('as_user', u); }
    return u;
  },
  /* Saved locally right away, then to the server; if the server refuses (for example the username is taken) the old values come back */
  set(patch) {
    const a = Auth.current();
    if (!a) { jset('as_user', { ...User.get(), ...patch }); return Promise.resolve(); }
    const { name, bio, avatar } = patch;
    const clean = { name, bio, avatar };
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
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
      const pg = location.pathname.split('/').pop();
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

const SITE_BUILD = 'v82';
const CONTINUE_MAX = 24;                               // Continue watching holds this many anime
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
  clearHistory() { ['as_progress', 'as_seen', 'as_activity', 'as_epprog', 'as_cont_info'].forEach(k => localStorage.removeItem(k)); EpProg._pend = null; Continue._info = null; Sync.touch('hist'); },
  progress: () => jget('as_progress', {}),
  seen: () => jget('as_seen', {}),
  activity: () => jget('as_activity', {}),
  /* True once the last episode has been reached (a show that is over, or an airing show with a known total) */
  isDone: x => (x.end !== undefined ? !!x.end : x.ep >= x.total),
  saveProgress(m, ep) {
    if (Settings.get().incognito || !m || !m.id) return;
    ep = Number(ep);
    if (!(ep >= 1)) return;
    const total = epCountOf(m);
    const end = m.status === 'RELEASING' ? (!!m.episodes && ep >= m.episodes) : ep >= total;
    const p = Store.progress();
    p[m.id] = { id: m.id, title: titleOf(m), titles: titlesOf(m), cover: coverOf(m), ep, total, end, ts: Date.now() };
    try { jset('as_progress', p); }
    catch {                                              // Storage full: forget the oldest entries and try once more
      try {
        const keep = Object.values(p).sort((a, b) => b.ts - a.ts).slice(0, 40);
        const slim = {}; keep.forEach(x => { slim[x.id] = x; });
        jset('as_progress', slim);
      } catch { }
    }
    Sync.later();
    try {
      const seen = Store.seen();
      const arr = seen[m.id] || [];
      if (!arr.includes(ep)) {
        arr.push(ep); seen[m.id] = arr; jset('as_seen', seen);
        const act = Store.activity(); const k = dayKey();
        act[k] = (act[k] || 0) + 1; jset('as_activity', act);
      }
    } catch { }
  },
  /* Fetch both title languages once for entries saved with only one; resolves true if something changed */
  async fillTitles() {
    const ids = [...new Set([...Store.list(), ...Object.values(Store.progress())].filter(x => !x.titles).map(x => x.id))].slice(0, 50);
    if (!ids.length) return false;
    try {
      const got = {};
      (await Api.titlesOf(ids)).Page.media.forEach(m => { got[m.id] = titlesOf(m); });
      /* Read again only now: anything saved while waiting for the network (another tab, a new episode) must not be overwritten */
      const list = Store.list(), prog = Store.progress();
      let changed = false;
      list.forEach(x => { if (!x.titles && got[x.id]) { x.titles = got[x.id]; changed = true; } });
      Object.values(prog).forEach(x => { if (!x.titles && got[x.id]) { x.titles = got[x.id]; changed = true; } });
      if (changed) { jset('as_list', list); jset('as_progress', prog); }
      return changed;
    } catch { return false; }
  },
};

/* How far through each episode you are (0-100), for the underline under every episode. Kept on this device only.
   A player message with the playback position moves the bar live; once an episode is played to the end it is marked finished and greyed out. */
const EpProg = {
  KEY: 'as_epprog',
  END: 95,                                              // At or past this many percent counts as watched to the end
  _pend: null, _t: 0,
  all: () => jget('as_epprog', {}),
  /* { ep: { p, d } } for one anime; d = reached the end at some point */
  of(id) {
    const o = EpProg.all()[id] || {}, out = {};
    for (const k in o) { const p = Number(o[k].p) || 0; out[k] = { p, d: !!o[k].d || p >= EpProg.END }; }
    const q = EpProg._pend;
    if (q && q.id == id) out[q.ep] = { p: q.p, d: !!(out[q.ep]?.d || q.p >= EpProg.END) };
    return out;
  },
  /* Percent watched from a player message, or null when the message carries no position. Providers differ in shape, so stay tolerant. */
  fromMessage(d) {
    if (!d || typeof d !== 'object') return null;
    const src = [d, d.data, d.info, d.payload].filter(x => x && typeof x === 'object');
    const pick = keys => { for (const o of src) for (const k of keys) { if (o[k] == null || o[k] === '' || typeof o[k] === 'boolean') continue; const v = Number(o[k]); if (isFinite(v)) return v; } return null; };
    const t = pick(['currentTime', 'current_time', 'time', 'position', 'played', 'seconds']);
    const dur = pick(['duration', 'total', 'totalTime', 'length']);
    if (t != null && dur > 0) return Math.max(0, Math.min(100, t / dur * 100));
    const pc = pick(['percent', 'percentage']);
    if (pc != null) return Math.max(0, Math.min(100, pc));
    const fr = pick(['progress']);
    if (fr != null) return Math.max(0, Math.min(100, fr <= 1 ? fr * 100 : fr));
    return null;
  },
  /* Remember a position. The page repaints its own bar at once; storage is written a few seconds at a time. */
  record(id, ep, p, { raiseOnly = false } = {}) {
    ep = Number(ep); p = Math.max(0, Math.min(100, Number(p) || 0));
    if (Settings.get().incognito || !id || !(ep >= 1)) return null;
    const known = EpProg.of(id)[ep];
    if (raiseOnly && known && known.p >= p) return known;
    const q = EpProg._pend;
    if (q && (q.id != id || q.ep !== ep)) EpProg.flush();
    EpProg._pend = { id, ep, p: Math.round(p * 10) / 10 };
    if (!EpProg._t) EpProg._t = setTimeout(EpProg.flush, 2500);
    return { p, d: !!(known?.d || p >= EpProg.END) };
  },
  flush() {
    clearTimeout(EpProg._t); EpProg._t = 0;
    const q = EpProg._pend; EpProg._pend = null;
    if (!q) return;
    try {
      const all = EpProg.all(), a = all[q.id] || (all[q.id] = {});
      a[q.ep] = { p: q.p, d: (a[q.ep] && a[q.ep].d) || q.p >= EpProg.END ? 1 : 0, ts: Date.now() };
      const ids = Object.keys(all);
      if (ids.length > 120) {                           // Keep it small: drop the anime touched longest ago
        const last = i => Math.max(0, ...Object.values(all[i]).map(x => x.ts || 0));
        ids.sort((x, y) => last(x) - last(y)).slice(0, ids.length - 100).forEach(i => { delete all[i]; });
      }
      jset('as_epprog', all);
    } catch { }
  },
  /* Set one underline: width follows the position; a finished episode is full and greyed out by its .fin class */
  width: (st, live) => st ? (st.d && !live ? 100 : st.p) : 0,       // The episode being played shows where you are right now
  paint(el, st, live = false) {
    if (!el) return;
    el.classList.toggle('fin', !!(st && st.d));
    el.querySelectorAll('.ep-prog i, .se-prog i').forEach(bar => { bar.style.width = EpProg.width(st, live) + '%'; });
  },
};
addEventListener('pagehide', () => EpProg.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden) EpProg.flush(); });

const Dub = {
  _m: () => jget('as_nodub', {}),
  _until: () => Date.now() + 2 * 864e5,                                   // Re-checked after 2 days
  missing(id, ep) { const m = Dub._m(), now = Date.now(); return (m[id + ':' + ep] || 0) > now || (m[id + ':*'] || 0) > now; },   // This episode, or the whole show
  mark(id, ep) {
    const m = Dub._m(), now = Date.now();
    m[id + ':' + ep] = Dub._until();
    const keys = Object.keys(m);
    if (keys.length > 300) keys.forEach(k => { if (m[k] < now) delete m[k]; });
    jset('as_nodub', m);
  },
  clear(id, ep) { const m = Dub._m(); if (m[id + ':' + ep]) { delete m[id + ':' + ep]; jset('as_nodub', m); } },
  markSeries(id) { const m = Dub._m(); m[id + ':*'] = Dub._until(); jset('as_nodub', m); },    // Episode 1 has no dub: the show has none
  clearSeries(id) { const m = Dub._m(); if (m[id + ':*']) { delete m[id + ':*']; jset('as_nodub', m); } },
  _seen: {},
  probe(id, ep) {
    const k = id + ':' + ep;
    if (Dub._seen[k]) return Dub._seen[k];
    const one = url => {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 5000);
      return fetch(url, { cache: 'no-store', signal: c.signal })
        .then(r => { clearTimeout(t); try { r.body && r.body.cancel(); } catch { } return r.ok ? 'yes' : r.status === 404 ? 'no' : null; })
        .catch(() => { clearTimeout(t); return null; });
    };
    return Dub._seen[k] = Promise.all([
      one(`https://megavid.buzz/stream/ani/${id}/${ep}/dub`),
      one(`https://megaplay.buzz/stream/ani/${id}/${ep}/dub`),
    ]).then(r => r.includes('yes') ? 'yes' : r.every(x => x === 'no') ? 'no' : null);
  },
};

const Sync = {
  _p: null, _again: false, _t: 0, _poll: 0, off: '',
  meta: () => jget('as_sync', {}),
  /* Stamp a change so merges know which device edited last; only stamped while signed in */
  touch(kind) {
    if (!Auth.current()) return;
    const m = Sync.meta(), now = Date.now();
    if (kind === 'list') m.listTs = now; else if (kind === 'fav') m.favTs = now; else if (kind === 'hist') m.histTs = now;
    else if (kind === 'cm') m.cmTs = now;
    jset('as_sync', m);
    Sync.later();
  },
  later(ms = 400) { if (Auth.current() && !Sync.off) { clearTimeout(Sync._t); Sync._t = setTimeout(() => Sync.run(), ms); } },
  _last: 0,
  view() { if (Date.now() - Sync._last > 6000) return Sync.run(); return Sync._p || Promise.resolve(false); },
  /* Resolves when a sync finishes or after ms, whichever is first (never blocks the page for long) */
  fresh(ms = 1500) { return Promise.race([Sync.view().catch(() => false), new Promise(r => setTimeout(r, ms))]); },
  _stable: v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x),
  _local(m) {
    return { list: jget('as_list', []), listTs: m.listTs || 0, fav: jget('as_fav', []), favTs: m.favTs || 0,
      progress: jget('as_progress', {}), seen: jget('as_seen', {}), activity: jget('as_activity', {}), histTs: m.histTs || 0,
      cm: jget('as_cm_ok', []), cmTs: m.cmTs || 0 };
  },
  _norm: r => ({ list: Array.isArray(r?.list) ? r.list : [], listTs: Number(r?.listTs) || 0, fav: Array.isArray(r?.fav) ? r.fav : [], favTs: Number(r?.favTs) || 0,
    progress: r?.progress && typeof r.progress === 'object' ? r.progress : {}, seen: r?.seen && typeof r.seen === 'object' ? r.seen : {},
    activity: r?.activity && typeof r.activity === 'object' ? r.activity : {}, histTs: Number(r?.histTs) || 0,
    cm: Array.isArray(r?.cm) ? r.cm.map(Number).filter(Boolean) : [], cmTs: Number(r?.cmTs) || 0 }),
  /* baseline: this device has synced with this account before, so timestamps can be trusted for list/favourites */
  merge(l, r, baseline) {
    const uniq = (arr, key) => { const s = new Set(); return arr.filter(x => { const k = key(x); if (s.has(k)) return false; s.add(k); return true; }); };
    const out = {};
    if (baseline) { const w = l.listTs >= r.listTs ? l : r; out.list = w.list; out.listTs = w.listTs; }
    else { out.list = uniq([...r.list, ...l.list].filter(x => x && x.id != null), x => x.id).slice(0, 500); out.listTs = Math.max(l.listTs, r.listTs); }
    if (baseline) { const w = l.favTs >= r.favTs ? l : r; out.fav = w.fav; out.favTs = w.favTs; }
    else { out.fav = uniq([...r.fav, ...l.fav], x => x).slice(0, 500); out.favTs = Math.max(l.favTs, r.favTs); }
    out.histTs = Math.max(l.histTs, r.histTs);
    /* Anime whose comments you opened: the newer list wins, but a device that never stamped one is merged in instead of overwritten */
    out.cmTs = Math.max(l.cmTs || 0, r.cmTs || 0);
    out.cm = (l.cmTs && r.cmTs) ? ((l.cmTs >= r.cmTs ? l.cm : r.cm) || []) : [...new Set([...(r.cm || []), ...(l.cm || [])])].slice(-400);
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
    put('as_cm_ok', merged.cm, local.cm);
    return changed;
  },
  _wipeLocal() { ['as_list', 'as_fav', 'as_progress', 'as_seen', 'as_activity', 'as_epprog', 'as_cont_info', 'as_cm_ok', 'as_sync'].forEach(k => localStorage.removeItem(k)); EpProg._pend = null; Continue._info = null; },
  run() {
    if (!Auth.current() || !Auth.configured() || Sync.off) return Promise.resolve(false);
    if (Sync._p) { Sync._again = true; return Sync._p; }
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
    if (meta.uid && meta.uid !== uid) { Sync._wipeLocal(); meta = {}; }
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
    jset('as_sync', { uid, listTs: merged.listTs, favTs: merged.favTs, histTs: merged.histTs, cmTs: merged.cmTs || 0 });
    Sync._sig = Sync._stable(Sync._local(Sync.meta()));
    if (!remote || Sync._stable(merged) !== Sync._stable(remote)) {
      const { error: e2 } = await sb.from('user_data').upsert({ user_id: uid, data: { v: 1, ...merged }, updated_at: new Date().toISOString() });
      if (e2) return changed;
    }
    localStorage.setItem('as_sync_at', String(Date.now()));
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
    } catch { }
  },
  /* Called once per page: first sync now, then keep the tab fresh */
  start() {
    Sync.run();
    if (Sync._poll) return;
    Sync._poll = 1;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Sync.flush(); });
    window.addEventListener('pagehide', () => Sync.flush());
    window.addEventListener('pageshow', e => { if (e.persisted) Sync.view(); });
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

/* Continue watching. This is the only place that decides what the row holds and when it refreshes.
   A page hands over its painter once with Continue.bind(paint). From then on, loading the page, coming back to the tab,
   a finished sync and another tab saving progress all end in the same run(), so nothing can overlap or paint stale data. */
const Continue = {
  _paint: null, _wired: false, _seq: 0, _t: 0, _info: null,
  /* Last known status of each show ({ status, episodes, next }), kept so even the first paint follows the same rule as the checked one */
  _known() { return Continue._info || (Continue._info = jget('as_cont_info', {})); },
  /* The list: what you saved, compared with what has aired since. Stays while you are on the newest episode of an airing show; leaves when the last episode is reached */
  items() {
    const known = Continue._known();
    return Object.values(Store.progress()).sort((a, b) => b.ts - a.ts).map(x => {
      const m = known[x.id];
      let avail = x.total, end = Store.isDone(x);
      if (m) {
        avail = m.status === 'RELEASING' ? (m.next ? m.next - 1 : (m.episodes || x.total)) : (m.episodes || x.total);
        avail = Math.max(1, avail);
        end = m.status === 'RELEASING' ? (!!m.episodes && x.ep >= m.episodes) : x.ep >= avail;
      }
      avail = Math.max(1, avail);
      return { ...x, avail, end, fresh: Math.max(0, avail - x.total) };
    }).filter(x => !x.end).slice(0, CONTINUE_MAX);      // Most recently watched first: a new anime takes the front and the oldest one falls off the end
  },
  /* Paint now from storage, then check what has aired (one light, cached query) and paint again only if the answer changed anything */
  async run() {
    const paint = Continue._paint, seq = ++Continue._seq;
    if (!paint) return;
    paint(Continue.items());
    const ids = Object.values(Store.progress()).sort((a, b) => b.ts - a.ts).slice(0, 50).map(x => x.id);
    if (!ids.length) return;
    let res; try { res = await Api.statusOf(ids); } catch { return; }
    if (seq !== Continue._seq) return;                  // A newer run started while this one waited: its answer wins
    const known = Continue._known(), keep = Store.progress();
    res.Page.media.forEach(m => { known[m.id] = { status: m.status, episodes: m.episodes || 0, next: m.nextAiringEpisode ? m.nextAiringEpisode.episode : 0 }; });
    Object.keys(known).forEach(id => { if (!keep[id]) delete known[id]; });
    try { jset('as_cont_info', known); } catch { }
    paint(Continue.items());
  },
  /* Anything that wants a fresh row asks here; requests that land together (tab visible + pageshow + sync) become one run */
  refresh() { clearTimeout(Continue._t); Continue._t = setTimeout(Continue.run, 60); },
  bind(paint) {
    Continue._paint = paint;
    if (!Continue._wired) {
      Continue._wired = true;
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Continue.refresh(); });
      addEventListener('pageshow', e => { if (e.persisted) Continue.refresh(); });
      document.addEventListener('as:synced', Continue.refresh);
      addEventListener('storage', e => { if (e.key === null || e.key === 'as_progress' || e.key === 'as_settings') Continue.refresh(); });   // Watched something in another tab
    }
    Continue.run();
  },
};
function continueCardHTML(x) {
  const ep = x.fresh && x.ep >= x.total ? x.ep + 1 : x.ep;
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
  const pt = airedCount(m) === 0 ? null : playTarget(m);
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
  if (!watched && prog && prog.ep < ep) target = seen.includes(prog.ep) ? prog.ep + 1 : prog.ep;
  const playHref = `watch.html?id=${m.id}&ep=${target}`, details = `anime.html?id=${m.id}`;
  return `
    <article class="card ${watched ? 'is-watched' : ''}">
      <div class="card-media">
        <img loading="lazy" decoding="async" src="${thumbOf(m)}" alt="${esc(titleOf(m))}">
        ${watched ? '<span class="badge badge-watched">Watched</span>' : `<span class="badge badge-air">${timeAgo(at)}</span>`}
        ${target !== ep ? `<span class="badge badge-note">Up next: Ep ${target}</span>` : ''}
        ${hitHTML(details, titleOf(m))}
        ${playBtnHTML(playHref, `Play Ep ${target}`)}
        <span class="card-tags"><span class="tag eps">Episode ${ep}</span>${fmtLabel(m) ? `<span class="tag fmt">${esc(fmtLabel(m))}</span>` : ''}</span>
        ${hoverDescHTML(m)}
      </div>
      <a class="card-title" href="${details}">${esc(titleOf(m))}</a>
    </article>`;
}

const HoverPop = (() => {
  const mq = window.matchMedia('(hover:hover) and (pointer:fine) and (min-width:901px)');
  let layer, pop, card = null, showT, hideT, vidT, token = 0, muted = true;
  let pending = null;
  let dismissed = null;
  let lastX = -1, lastY = -1;
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
    const kx = (b.left - a.left) / 100 || 1, ky = (b.top - a.top) / 100 || 1;
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
    if (!c.isConnected) { probe(); return; }
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
    lazyTrailer(info.id, tk, !Settings.get().hoverTrailer || Settings.get().reduceMotion);
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
      if (d.event === 'onError') { f.remove(); window.removeEventListener('message', onMsg); return; }
      const st = d.event === 'onStateChange' ? d.info : d.info?.playerState;
      if (st === 1) reveal();
    };
    window.addEventListener('message', onMsg);
    f._off = () => window.removeEventListener('message', onMsg);
    f.addEventListener('load', () => {
      if (yt) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch { } }
      setTimeout(() => { if (!heard && f.isConnected) reveal(); }, yt ? 3200 : 1500);
    });
    f.src = src;
    host.appendChild(f);
  }

  function toggleMute(btn) {
    const f = $('.hp-video iframe', pop); if (!f) return;
    muted = !muted;
    const cmd = (func, args = []) => f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    try { if (muted) cmd('mute'); else { cmd('unMute'); cmd('setVolume', [60]); } } catch { }
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
    if (f) { f._off?.(); f.src = 'about:blank'; f.remove(); }
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
    if (c === card) { cancelShow(); return; }
    if (c === pending || c === dismissed) return;
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
  document.addEventListener('mousemove', e => {
    lastX = e.clientX; lastY = e.clientY;
    if (card || pending || !mq.matches) return;
    const c = e.target instanceof Element ? e.target.closest('.card') : null;
    if (c && c !== dismissed && c.querySelector('.card-data')) intend(c);
  }, { passive: true });
  document.addEventListener('mouseout', e => {
    if (e.relatedTarget) return;
    lastX = lastY = -1; dismissed = null; cancelShow();
    if (card) scheduleHide(250);
  });

  window.addEventListener('scroll', e => {
    const t = e.target, rel = t === document || (t instanceof Element && card && t.contains(card));
    if (card && rel) hide(); else if (pending && rel) cancelShow();
    clearTimeout(scrollT); scrollT = setTimeout(probe, 140);
  }, { passive: true, capture: true });

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
const ADULT_GENRES = ['Hentai', 'Erotica'];
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
  try { localStorage.setItem('as_hdr_v1', host.innerHTML.replace(/ class="on"/g, '')); } catch { }
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
  /* Closing plays the reverse of the open animation: .closing keeps the bar visible while it fades and slides out */
  function closeSearch() {
    const p = $('#search-pop'); if (!p || !p.classList.contains('open')) { $$('.suggest').forEach(x => x.classList.remove('open')); return; }
    const still = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (still) { p.classList.remove('open'); $$('.suggest').forEach(x => x.classList.remove('open')); return; }
    p.classList.add('closing');
    clearTimeout(p._ct);
    p._ct = setTimeout(() => { p.classList.remove('open', 'closing'); $$('.suggest').forEach(x => x.classList.remove('open')); }, 150);
  }
  const closeAll = () => { closeSearch(); menu.classList.remove('open'); };

  $('#search-btn').onclick = e => {
    e.stopPropagation(); menu.classList.remove('open');
    if (pop.classList.contains('open')) closeSearch();
    else { pop.classList.remove('closing'); pop.classList.add('open'); input.focus(); }
  };
  $('#user-btn').onclick = e => { e.stopPropagation(); closeSearch(); menu.classList.toggle('open'); };
  if ($('#logout-btn')) $('#logout-btn').onclick = () => { toast('Logging out...'); User.logout().finally(() => { toast('Logged out'); setTimeout(() => location.href = 'index.html', 400); }); };
  if ($('#menu-login-btn')) $('#menu-login-btn').onclick = () => { closeAll(); openAuth('login'); };
  if (first) {
    document.addEventListener('click', e => { if (!e.target.closest('.search-pop, .user-wrap')) { closeSearch(); $$('.user-menu').forEach(x => x.classList.remove('open')); } });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeSearch(); $$('.user-menu').forEach(x => x.classList.remove('open')); }
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
      lastQ = '';
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
    if (e.key === 'Tab') {
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
      Sync.start();
      const page = location.pathname.split('/').pop();
      if (/^(profile|settings|leaderboard)\.html$/.test(page)) setTimeout(() => location.reload(), 400);
      else buildHeader();
    } catch (ex) {
      err.textContent = ex.message || 'Something went wrong';
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      go.disabled = false;
    }
  };
}

const Reveal = (() => {
  const off = () => !('IntersectionObserver' in window) || Settings.get().reduceMotion || matchMedia('(prefers-reduced-motion:reduce)').matches;
  let io;
  const obs = () => io || (io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el);
      el.classList.add('rv-in');
      setTimeout(() => el.classList.remove('rv', 'rv-in'), 650);
    });
  }, { rootMargin: '0px 0px 120px 0px', threshold: 0 }));
  return {
    watch(root, sel) {
      if (off() || !root) return;
      const o = obs();
      const items = $$(sel, root);
      items.forEach((el, i) => { el.style.setProperty('--rv-d', Math.min(i % 8, 7) * 45 + 'ms'); el.classList.add('rv'); o.observe(el); });
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
    <p class="footer-note muted">Amnestream doesn't host any files; it only shows content from third-party providers.</p>
    <p class="footer-note muted" style="margin-top:6px;font-size:11px;opacity:.6">Build ${SITE_BUILD}</p>`;
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

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  /* A new version of the site takes over by itself: reload once so you are never left on stale files */
  const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadSW || reloaded) return; reloaded = true; location.reload(); });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {}));
}

document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('.main-nav a, .logo');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
  const href = a.getAttribute('href'), cur = location.pathname.split('/').pop() || 'index.html';
  if (!href || href === cur) return;
  if (document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  e.preventDefault();
  $$('.main-nav a').forEach(x => x.classList.toggle('on', x === a));
  document.body.classList.add('page-leaving');
  location.href = href;
});
/* Warm the next page as soon as the pointer is over a nav link, so the click finds it ready */
(() => {
  const done = new Set();
  const warm = e => {
    const a = e.target.closest && e.target.closest('.main-nav a, .logo'), h = a && a.getAttribute('href');
    if (!h || done.has(h) || h === (location.pathname.split('/').pop() || 'index.html')) return;
    done.add(h);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; document.head.appendChild(l);
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('touchstart', warm, { passive: true });
})();
window.addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('page-leaving'); });

document.addEventListener('DOMContentLoaded', () => {
  buildHeader(); buildFooter(); buildBackToTop();
});

document.addEventListener('input', e => {
  const t = e.target;
  if (!t.matches || !t.matches('textarea.bio-in')) return;
  const c = t.parentElement && t.parentElement.querySelector('.bio-count');
  if (c) { c.textContent = t.value.length + '/' + BIO_MAX; c.classList.toggle('full', t.value.length >= BIO_MAX); }
});
