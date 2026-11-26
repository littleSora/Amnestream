const Q = new URLSearchParams(location.search);
const WID = Number(Q.get('id'));
let EP = Math.max(1, Number(Q.get('ep')) || 1);
const HAS_LANG = ['sub', 'dub'].includes(Q.get('lang'));
let LANG = HAS_LANG ? Q.get('lang') : localStorage.getItem('as_lang') || Settings.get().audio;
const syncURL = () => history.replaceState(null, '', `watch.html?id=${WID}&ep=${EP}${HAS_LANG ? '&lang=' + LANG : ''}`);
let PREF_LANG = LANG;
let MEDIA = null;
let VP = null;                                              // The Amnestream player, when a direct server is playing

/* ---------- Servers ----------
   embed:  somebody else's player page inside an iframe (its own controls)
   direct: a media link played by our own player (js/vplayer.js), see js/sources.js */
const EMBEDS = [
  { id: 'anixo',        label: 'Anixo',          key: 'anilist', host: 'anixo.buzz',
    url: (a, m, e, l) => `https://anixo.buzz/embed/ani/${a}/${e}?track=${l}` },
  { id: 'megavid',      label: 'MegaVid',        key: 'anilist', host: 'megavid.buzz',
    url: (a, m, e, l) => `https://megavid.buzz/stream/ani/${a}/${e}/${l}` },
  { id: 'megavid-mirror', label: 'MegaVid Mirror', key: 'anilist', host: 'megaplay.su',
    url: (a, m, e, l) => `https://ani.megaplay.su/stream/ani/${a}/${e}/${l}` },
  { id: 'megaplay',     label: 'MegaPlay',       key: 'anilist', host: 'megaplay.buzz',
    url: (a, m, e, l) => `https://megaplay.buzz/stream/ani/${a}/${e}/${l}` },

  { id: 'anixo-mal',    label: 'Anixo (MAL)',    key: 'mal', host: 'anixo.buzz',
    url: (a, m, e, l) => `https://anixo.buzz/embed/mal/${m}/${e}?track=${l}` },
  { id: 'megavid-mal',  label: 'MegaVid (MAL)',  key: 'mal', host: 'megavid.buzz',
    url: (a, m, e, l) => `https://megavid.buzz/stream/mal/${m}/${e}/${l}` },
  { id: 'megaplay-mal', label: 'MegaPlay (MAL)', key: 'mal', host: 'megaplay.buzz',
    url: (a, m, e, l) => `https://megaplay.buzz/stream/mal/${m}/${e}/${l}` },

  { id: 'vidnest',      label: 'VidNest',        key: 'anilist', host: 'vidnest.fun',
    url: (a, m, e, l) => `https://vidnest.fun/animepahe/${a}/${e}/${l}` },
].map(s => ({ ...s, kind: 'embed', group: 'Embedded', auto: true }));

const DIRECTS = (window.AmneSources ? AmneSources.list() : []).map(d => ({ ...d, kind: 'direct', key: 'any' }));
const SERVERS = [
  ...DIRECTS.filter(d => d.auto !== false),
  ...EMBEDS,
  ...DIRECTS.filter(d => d.auto === false),               // Test servers last
];

const PROVIDER_HOSTS = EMBEDS.map(s => s.host);

const OLD_SERVER_MAP = { ani: 'anixo', mal: 'anixo-mal' };
let SERVER = (() => {
  const saved = localStorage.getItem('as_server');
  if (saved && saved !== 'demo' && SERVERS.some(s => s.id === saved)) return saved;
  if (saved && OLD_SERVER_MAP[saved]) return OLD_SERVER_MAP[saved];
  return SERVERS[0].id;
})();

const DEAD_TTL = 30 * 60e3;
const deadMap = () => { try { return JSON.parse(localStorage.getItem('as_dead_servers')) || {}; } catch { return {}; } };
const deadKey = id => id + ':' + LANG;                       // A server can fail for dub and still work for sub
const isDead = id => { const d = deadMap()[deadKey(id)]; return !!d && d > Date.now(); };
function markDead(id) { const d = deadMap(); d[deadKey(id)] = Date.now() + DEAD_TTL; localStorage.setItem('as_dead_servers', JSON.stringify(d)); }
function markAlive(id) { const d = deadMap(); if (d[deadKey(id)]) { delete d[deadKey(id)]; localStorage.setItem('as_dead_servers', JSON.stringify(d)); } }

const ctx = () => ({ anilistId: MEDIA.id, malId: MEDIA.idMal, episode: EP, lang: LANG });
const currentServer = () => SERVERS.find(s => s.id === SERVER) || SERVERS[0];
const labelOf = id => (SERVERS.find(s => s.id === id) || {}).label || id;
const usable = s => s.kind === 'direct' ? AmneSources.usable(s.id, ctx()) : (s.key === 'mal' ? !!MEDIA.idMal : !!MEDIA.id);
function liveServers() {
  const u = SERVERS.filter(s => s.auto !== false && usable(s));
  const l = u.filter(s => !isDead(s.id));
  return l.length ? l : u;
}
function nextServerId(fromId) {
  const l = liveServers();
  if (!l.length) return null;
  const i = l.findIndex(s => s.id === fromId);
  return l[(i + 1) % l.length].id;
}

let autoTried = 0;
let playerReady = false;
let _malT = 0;
let loadTimer, readyTimer;
let mountSeq = 0;

const SVG = (p, s = 18, w = 2.2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  compact: '<path d="M3 6h18M3 10h18M3 14h18M3 18h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

async function initWatch() {
  if (!WID) { location.href = 'index.html'; return; }
  try {
    const { Media } = await Api.playerMeta(WID);
    MEDIA = Media;
    if (airedCount(MEDIA) === 0) {
      document.title = `${titleOf(MEDIA)} - Amnestream`;
      $('#w-title').textContent = titleOf(MEDIA);
      $('#w-sub').textContent = 'This anime has not aired yet.';
      $('#player').innerHTML = `<div class="player-fallback"><div>No episodes have aired yet.<br><a class="btn btn-primary" style="margin-top:14px" href="anime.html?id=${MEDIA.id}">Back to details</a></div></div>`;
      $$('.wp-deck, .wp-side, .wp-comments').forEach(el => { el.style.display = 'none'; });
      return;
    }
    if (EP > epCountOf(MEDIA)) { EP = epCountOf(MEDIA); syncURL(); }
    document.title = `${titleOf(MEDIA)} - Episode ${EP} - Amnestream`;
    initTabs(); initMini(); initServerPanel(); initEpTools(); initEpFade();
    buildPage();
  } catch (err) {
    $('#player').innerHTML = `<div class="player-fallback">${esc(err.message)}</div>`;
  }
}

function buildPage() {
  const total = epCountOf(MEDIA);
  EpProg.flush();                           // Write down how far the previous episode got before the list repaints
  Store.saveProgress(MEDIA, EP);            // First, so nothing that fails further down can stop it from being remembered
  LANG = PREF_LANG === 'dub' && Dub.missing(MEDIA.id, EP) && currentServer().kind === 'embed' ? 'sub' : PREF_LANG;
  paintAudio();

  $('#w-title').textContent = titleOf(MEDIA);
  $('#w-sub').innerHTML =
    `Episode <strong>${EP}</strong> of ${total} &middot; ${esc(fmtLabel(MEDIA))} &middot; ` +
    `<span class="muted">${esc(statusLabel(MEDIA))}</span>`;
  $('#info-link').href = 'anime.html?id=' + MEDIA.id;

  $$('#lang-seg button').forEach(b => { b.onclick = () => setLang(b.dataset.lang); });
  paintDub();
  paintServers();
  paintChips();

  $('#reload-player').onclick = () => { autoTried = 0; mountPlayer(); };

  $('#prev-ep').disabled = EP <= 1;
  $('#next-ep').disabled = EP >= total;
  $('#prev-label').textContent = EP > 1 ? 'Episode ' + (EP - 1) : 'None';
  $('#next-label').textContent = EP < total ? 'Episode ' + (EP + 1) : 'None';
  $('#prev-ep').onclick = () => gotoEp(EP - 1);
  $('#next-ep').onclick = () => gotoEp(EP + 1);

  renderSideEps(total);
  if (!_artAsked) {
    _artAsked = true;
    Api.episodeGuide(MEDIA).then(guide => {
      epTitleOf(1);
      if (JSON.stringify(guide) === JSON.stringify(_epTitles)) return;
      _epTitles = guide;
      renderSideEps(epCountOf(MEDIA));
    }).catch(() => {});
  }
  loadExtras();
  mountPlayer();
  startEstimate();
  checkDub();
  mountComments();
  clearTimeout(_malT);
  if (typeof Mal !== 'undefined' && Mal.active()) { const m = MEDIA, e = EP; _malT = setTimeout(() => Mal.track(m, e), Math.max(4, (m.duration || 24) * .7) * 60e3); }

  $('#autonext').checked = Settings.get().autonext;
  $('#autonext').onchange = e => Settings.set('autonext', e.target.checked);
  window.addEventListener('message', onPlayerMessage);
}

/* Comments for this episode only; remounted whenever the episode changes */
function mountComments() {
  const box = $('#p-cm'); if (!box) return;
  const id = MEDIA.id, ep = EP;
  $('#cm-title').firstChild.textContent = `Episode ${ep} comments `;
  const count = () => Comments.count(id, ep).then(n => { if (ep === EP && Comments.allowed(id)) $('#cm-total').textContent = n ? `(${n})` : ''; }).catch(() => {});
  $('#cm-total').textContent = '';
  if (typeof Comments === 'undefined') { box.innerHTML = '<p class="empty">Comments failed to load. Refresh the page.</p>'; return; }
  Comments.mountGated(box, id, count, ep, hidden => { if (hidden) $('#cm-total').textContent = ''; else count(); });
}

/* ---------- Audio (Sub / Dub) ---------- */
function paintAudio() {
  const seg = $('#lang-seg');
  seg.dataset.v = LANG;
  $$('#lang-seg button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
}
function setLang(l) {
  if (l === 'dub' && currentServer().kind === 'embed' && Dub.missing(MEDIA.id, EP)) { toast('No dub for this episode.'); return; }
  LANG = PREF_LANG = l;
  autoTried = 0;
  localStorage.setItem('as_lang', LANG);
  if (HAS_LANG) syncURL();
  paintAudio();
  paintServers();
  mountPlayer();
}
/* Cross out DUB when this episode's dub is known not to play (only the embedded servers are probed) */
function paintDub() {
  const no = MEDIA && currentServer().kind === 'embed' && Dub.missing(MEDIA.id, EP), b = $('#lang-seg button[data-lang="dub"]');
  if (b) { b.classList.toggle('no-dub', !!no); b.setAttribute('aria-disabled', String(!!no)); b.title = no ? 'No dub found for this episode' : ''; }
}
async function checkDub() {
  const id = MEDIA.id, ep = EP;
  const r = await Dub.probe(id, ep);
  if (!MEDIA || id !== MEDIA.id || ep !== EP) return;
  if (r === 'no') { Dub.mark(id, ep); if (ep === 1) Dub.markSeries(id); }
  else if (r === 'yes') { Dub.clear(id, ep); if (ep === 1) Dub.clearSeries(id); }
  paintDub();
  if (r === 'no' && LANG === 'dub' && currentServer().kind === 'embed') dubMissing();
}
function dubMissing() {                                              // Nothing to play in dub: say so and fall back to sub
  clearTimeout(loadTimer); clearTimeout(readyTimer);
  Dub.mark(MEDIA.id, EP); paintDub();
  LANG = 'sub';
  paintAudio();
  toast('No dub for this episode, switched to Sub.');
  mountPlayer();
}

/* ---------- Server picker ---------- */
function initServerPanel() {
  const btn = $('#server-btn'), list = $('#server-list');
  btn.onclick = () => { const open = list.hidden; list.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  list.onclick = e => {
    const b = e.target.closest('.wp-srv'); if (!b) return;
    list.hidden = true; btn.setAttribute('aria-expanded', 'false');
    if (b.dataset.id !== SERVER) setServer(b.dataset.id); else { autoTried = 0; mountPlayer(); }
  };
}
function paintServers() {
  const cur = currentServer(), items = SERVERS.filter(usable);
  const state = id => id === SERVER && playerReady ? 'ok' : isDead(id) ? 'bad' : id === SERVER ? 'load' : '';
  $('#server-name').textContent = cur.label;
  $('#server-dot').className = 'dot ' + state(cur.id);
  const groups = [...new Set(items.map(s => s.group))];
  $('#server-list').innerHTML = groups.map(g =>
    `<div class="wp-sg"><h4>${esc(g)}</h4>${items.filter(s => s.group === g).map(s =>
      `<button class="wp-srv${s.id === SERVER ? ' on' : ''}" type="button" data-id="${s.id}"><i class="dot ${state(s.id)}"></i><b>${esc(s.label)}</b>${isDead(s.id) ? '<u>failed</u>' : ''}${s.id === SERVER ? SVG(IC.check, 16, 2.6) : ''}</button>`).join('')}</div>`
  ).join('');
}
function setServer(v) {
  SERVER = v;
  if (v !== 'demo') localStorage.setItem('as_server', SERVER);
  autoTried = 0;
  paintDub();
  paintServers(); paintChips();
  mountPlayer();
}
function paintChips() {
  const s = currentServer();
  $('#w-chips').innerHTML = s.kind === 'direct'
    ? `<span class="wp-chip"><i></i>Amnestream Player</span><span class="wp-chip soft">Subtitles: CC button in the player</span>`
    : `<span class="wp-chip soft"><i></i>Embedded server</span><span class="wp-chip soft">Subtitles are set inside the player</span>`;
}

/* ---------- Player mounting ---------- */
function stopPlayer() {
  clearTimeout(loadTimer); clearTimeout(readyTimer);
  if (VP) { VP.destroy(); VP = null; }
  $('#stage').classList.remove('has-vp');
  $('#resume').hidden = true;
  $('#player').innerHTML = '';
}

function embedURL() {
  const s = currentServer();
  const id = s.key === 'mal' ? MEDIA.idMal : MEDIA.id;
  if (!id) return '';
  return s.url(MEDIA.id, MEDIA.idMal, EP, LANG);
}

/* In-player message instead of a provider's raw error page */
function showPlayerError(text = 'Server error. Please swap to another server.') {
  clearTimeout(loadTimer); clearTimeout(readyTimer);
  if (VP) { VP.destroy(); VP = null; $('#stage').classList.remove('has-vp'); $('#player').innerHTML = ''; }
  const box = $('#player'); if (!box) return;
  $('#player-loading')?.remove(); $('.player-error', box)?.remove();
  const el = document.createElement('div');
  el.className = 'player-error';
  el.innerHTML = `<div><p>${esc(text)}</p>
    <div class="pe-actions"><button class="btn btn-primary" id="pe-swap">Swap server</button><button class="btn btn-ghost" id="pe-reload">Reload</button></div></div>`;
  box.appendChild(el);
  paintServers();
  $('#pe-swap', el).onclick = () => { const n = nextServerId(SERVER); if (n && n !== SERVER) setServer(n); else mountPlayer(); };
  $('#pe-reload', el).onclick = () => { autoTried = 0; mountPlayer(); };
}

/* A server did not work: bench it and move to the next one right away; when none is left, say so */
function failServer(msg) {
  clearTimeout(readyTimer); clearTimeout(loadTimer);
  const s = currentServer();
  if (s.auto === false) { showPlayerError(msg || 'This test server could not play.'); return; }   // Never fail over away from, or into, a test server
  markDead(s.id);
  const nxt = nextServerId(s.id);
  const limit = LANG === 'dub' && s.kind === 'embed' ? 3 : SERVERS.filter(x => x.auto !== false && usable(x)).length;
  if (nxt && nxt !== s.id && autoTried < limit - 1) {
    autoTried++;
    SERVER = nxt;
    localStorage.setItem('as_server', SERVER);
    paintDub(); paintServers(); paintChips();
    toast(`Switching to ${labelOf(nxt)}...`);
    mountPlayer();
    return;
  }
  if (LANG === 'dub' && s.kind === 'embed') { dubMissing(); return; }
  showPlayerError(msg);
}

/* Asks the provider for the page first: an error status (404, 5xx) is known in a moment, long before the player would time out.
   Providers that block cross-origin reads just give no answer here and the timeout below still covers them. */
function probeEmbed(url, seq) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 6000);
  fetch(url, { cache: 'no-store', signal: ctrl.signal }).then(res => {
    clearTimeout(t);
    try { res.body && res.body.cancel(); } catch { }
    if (seq !== mountSeq || playerReady || res.status < 400) return;
    failServer();
  }).catch(() => clearTimeout(t));
}

function mountPlayer() {
  stopPlayer();
  playerReady = false;
  const seq = ++mountSeq, s = currentServer();
  paintServers();
  if (s.kind === 'direct') { mountDirect(s, seq); return; }

  const url = embedURL();
  $('#player').innerHTML = `
    <iframe src="${url}"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
    <div class="player-loading" id="player-loading"><span class="spinner"></span>Loading player...</div>`;
  if (url) probeEmbed(url, seq);
  readyTimer = setTimeout(() => { if (seq === mountSeq && !playerReady) failServer(); }, 7000);
}

/* ---------- The Amnestream player ---------- */
const POS_KEY = 'as_vp_pos';
const posMap = () => { try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch { return {}; } };
const posKey = () => MEDIA.id + ':' + EP;
let _posAt = 0;
function posSave(sec, dur, force) {
  const now = Date.now();
  if (!force && now - _posAt < 4000) return;
  _posAt = now;
  try {
    const m = posMap(), k = posKey();
    if (sec < 8 || sec > dur * 0.94) delete m[k]; else m[k] = Math.floor(sec);
    const keys = Object.keys(m);
    if (keys.length > 150) delete m[keys[0]];
    localStorage.setItem(POS_KEY, JSON.stringify(m));
  } catch { }
}

async function mountDirect(s, seq) {
  const box = $('#player');
  box.innerHTML = `<div class="player-loading" id="player-loading"><span class="spinner"></span>Loading player...</div>`;
  let media;
  try { media = await AmneSources.resolve(s.id, ctx()); }
  catch (err) {
    if (seq !== mountSeq) return;
    if (err.code === 'NO_DUB' && LANG === 'dub') { dubMissing(); return; }
    failServer(err.message);
    return;
  }
  if (seq !== mountSeq) return;
  $('#player-loading')?.remove();
  const real = s.auto !== false;                                      // The demo clip is not this episode: no progress, no resume
  const total = epCountOf(MEDIA);
  VP = VPlayer.create(box, {
    hasNext: () => EP < total, hasPrev: () => EP > 1,
    onNext: () => gotoEp(EP + 1), onPrev: () => gotoEp(EP - 1),
    onReady() {
      playerReady = true; autoTried = 0;
      if (real) markAlive(s.id);
      paintServers();
    },
    onError(e) { if (seq === mountSeq) failServer(e && e.message); },
    onProgress(pct, cur, dur) {
      if (!real || !MEDIA) return;
      paintLive(EpProg.record(MEDIA.id, EP, pct));
      posSave(cur, dur, false);
    },
    onEnded() {
      if (!real) return;
      posSave(0, 1, true);
      paintLive(EpProg.record(MEDIA.id, EP, 100)); EpProg.flush();
      if (typeof Mal !== 'undefined') Mal.track(MEDIA, EP);
      if ($('#autonext').checked) gotoEp(EP + 1);
    },
  });
  $('#stage').classList.add('has-vp');
  const syncMiniPlay = () => {
    const paused = !VP || VP.paused;
    $('#mini-play').innerHTML = paused
      ? SVG('<path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.4-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" fill="currentColor" stroke="none"/>', 16, 2)
      : SVG('<rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none"/>', 16, 2);
  };
  ['play', 'pause', 'ended'].forEach(ev => VP.video.addEventListener(ev, syncMiniPlay));
  syncMiniPlay();
  VP.setMeta({ title: titleOf(MEDIA), sub: real ? `Episode ${EP} of ${total}` : 'Demo clip, not this episode' });
  VP.load(media, { startAt: real ? posMap()[posKey()] || 0 : 0, autoplay: true, subsOff: LANG === 'dub' });
  if (miniOn) VP.setMini(true);
  _playing = true;

  if (real && !media.intro && !media.outro && MEDIA.idMal) {
    AmneSources.skipTimes(MEDIA.idMal, EP, (MEDIA.duration || 24) * 60).then(t => { if (t && seq === mountSeq && VP) VP.setSkips(t); });
  }
}

/* ---------- Floating window ---------- */
let miniOn = false, miniDismissed = false;
function livePlayer() {
  if (VP) return !VP.paused;
  return !!$('#player iframe') && $('#resume').hidden;
}
function setMini(on) {
  if (on === miniOn) return;
  miniOn = on;
  $('#stage').classList.toggle('is-mini', on);
  $('#stage-slot').classList.toggle('mini-on', on);
  if (VP) VP.setMini(on);
}
function stopEmbed() {
  clearTimeout(readyTimer); clearTimeout(loadTimer); ++mountSeq;
  const f = $('#player iframe'); if (f) f.src = 'about:blank';
  $('#resume').hidden = false;
}
function initMini() {
  const slot = $('#stage-slot'), stage = $('#stage');
  const corner = localStorage.getItem('as_mini_corner');
  if (/^(tl|tr|bl|br)$/.test(corner)) stage.dataset.corner = corner;

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { miniDismissed = false; setMini(false); return; }
    const gone = e.boundingClientRect.bottom < innerHeight * 0.5;
    if (gone && !miniDismissed && livePlayer()) setMini(true);
  }, { threshold: [0, 0.02], rootMargin: '-60px 0px 0px 0px' }).observe(slot);

  const back = () => { miniDismissed = false; slot.scrollIntoView({ behavior: scrollMode(), block: 'center' }); setTimeout(() => setMini(false), 40); };
  $('#mini-expand').onclick = back;
  $('#bring-back').onclick = back;
  $('#mini-close').onclick = () => {
    if (VP) VP.pause(); else stopEmbed();
    miniDismissed = true; setMini(false);
  };
  $('#mini-play').onclick = () => { if (VP) VP.toggle(); };
  $('#resume-btn').onclick = () => { $('#resume').hidden = true; autoTried = 0; mountPlayer(); };

  /* Drag the window by its top strip; it snaps to the nearest corner */
  const strip = $('#mini-bar');
  let drag = null;
  strip.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || !miniOn || e.button > 0) return;
    const r = stage.getBoundingClientRect();
    drag = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, moved: false, x: e.clientX, y: e.clientY };
    try { strip.setPointerCapture(e.pointerId); } catch { }
  });
  strip.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    drag.moved = true; stage.classList.add('dragging');
    stage.style.right = stage.style.bottom = 'auto';
    stage.style.left = Math.max(4, Math.min(innerWidth - stage.offsetWidth - 4, e.clientX - drag.ox)) + 'px';
    stage.style.top = Math.max(4, Math.min(innerHeight - stage.offsetHeight - 4, e.clientY - drag.oy)) + 'px';
  });
  const drop = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    stage.classList.remove('dragging');
    const r = stage.getBoundingClientRect();
    const c = (r.top + r.height / 2 < innerHeight / 2 ? 't' : 'b') + (r.left + r.width / 2 < innerWidth / 2 ? 'l' : 'r');
    stage.style.left = stage.style.top = stage.style.right = stage.style.bottom = '';
    stage.dataset.corner = c;
    localStorage.setItem('as_mini_corner', c);
    const a = stage.getBoundingClientRect();
    stage.animate([{ transform: `translate(${r.left - a.left}px,${r.top - a.top}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.9,.25,1.05)' });
  };
  strip.addEventListener('pointerup', drop);
  strip.addEventListener('pointercancel', drop);
}

/* ---------- Tabs (they never move when you switch) ---------- */
function initTabs() {
  const bar = $('.wp-side .dp-tabs'), box = $('#dp-panels'), ink = $('.dp-ink', bar);
  const place = () => {
    const on = $('.dp-tab.on', bar); if (!on) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
  };
  place();
  requestAnimationFrame(() => requestAnimationFrame(() => ink.classList.add('ready')));
  addEventListener('resize', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  window.placeTabInk = place;

  /* A shorter panel would shrink the page and make the browser pull the scroll position, so the bar jumped.
     The panel area is held at least as tall as the room under the bar, and any remaining shift is scrolled away in the same frame. */
  const holdStill = swap => {
    if (matchMedia('(min-width:1000px)').matches) { swap(); return; }          // The side column scrolls on its own there
    const root = document.documentElement, zoom = parseFloat(getComputedStyle(root).zoom) || 1;
    const y0 = bar.getBoundingClientRect().top;
    box.style.minHeight = Math.ceil(Math.max(0, innerHeight - box.getBoundingClientRect().top) / zoom) + 'px';
    swap();
    const dy = bar.getBoundingClientRect().top - y0;
    if (Math.abs(dy) > 0.5) {
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollBy(0, dy);
      root.style.scrollBehavior = prev;
    }
  };
  $$('.dp-tab', bar).forEach(t => t.onclick = () => {
    if (t.classList.contains('on') || t.disabled) return;
    holdStill(() => {
      $$('.dp-tab', bar).forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', String(x === t)); });
      $$('.dp-panel', box).forEach(p => { const on = p.id === 'p-' + t.dataset.p; p.classList.toggle('on', on); if (on) { p.classList.remove('dp-anim'); void p.offsetWidth; p.classList.add('dp-anim'); } });
      place();
    });
  });
}

/* ---------- Episodes ---------- */
let _epTitles = null, _artAsked = false;
function epTitleOf(n) {
  if (!_epTitles) {
    _epTitles = {};
    if (!Api.isSequel(MEDIA)) ((MEDIA && MEDIA.streamingEpisodes) || []).forEach(e => {      // A later season waits for the cleaned-up guide below
      const x = /(\d+)\s*[-\u2013:.]\s*(.*)$/.exec(e.title || '') || /Episode\s+(\d+)/i.exec(e.title || '');
      if (x && !_epTitles[+x[1]]) _epTitles[+x[1]] = { title: x[2] || '', thumb: e.thumbnail };
    });
  }
  return _epTitles[n] || {};
}
/* The episode column is only about as tall as the picture: the rest scrolls inside it.
   While there is more below, the bottom of the list fades out and the little animated line + arrow shows; once you scroll, the top fades too. */
function initEpFade() {
  const p = $('#dp-panels'), cue = $('#ep-cue');
  if (!p || !cue) return;
  let q = 0;
  const upd = () => {
    q = 0;
    const over = p.scrollHeight - p.clientHeight > 6, end = p.scrollTop + p.clientHeight >= p.scrollHeight - 8;
    p.classList.toggle('fade-b', over && !end);
    p.classList.toggle('fade-t', over && p.scrollTop > 8);
    cue.classList.toggle('on', over && !end);
    cue.tabIndex = over && !end ? 0 : -1;
  };
  const soon = () => { if (!q) q = requestAnimationFrame(upd); };
  p.addEventListener('scroll', soon, { passive: true });
  addEventListener('resize', soon);
  if (window.ResizeObserver) new ResizeObserver(soon).observe(p);
  new MutationObserver(soon).observe(p, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  cue.addEventListener('click', () => p.scrollBy({ top: Math.round(p.clientHeight * .8), behavior: 'smooth' }));
  soon();
}
const EP_STYLES = ['list', 'compact', 'grid'];
function initEpTools() {
  $('#ep-view').onclick = () => {
    const cur = EP_STYLES.includes(Settings.get().epStyle) ? Settings.get().epStyle : 'grid';
    Settings.set('epStyle', EP_STYLES[(EP_STYLES.indexOf(cur) + 1) % EP_STYLES.length]);
    renderSideEps(epCountOf(MEDIA));
  };
  $('#ep-sort').onclick = () => {
    Settings.set('epOrder', Settings.get().epOrder === 'desc' ? 'asc' : 'desc');
    renderSideEps(epCountOf(MEDIA));
  };
}
function renderSideEps(total) {
  const box = $('#side-eps'), s = Settings.get();
  const style = EP_STYLES.includes(s.epStyle) ? s.epStyle : 'grid';
  const prog = EpProg.of(MEDIA.id);
  const fb = bannerOf(MEDIA) || thumbOf(MEDIA);
  let nums = Array.from({ length: total }, (_, i) => i + 1);
  if (s.epOrder === 'desc') nums.reverse();
  $('#ep-count').textContent = total + (total === 1 ? ' episode' : ' episodes');
  $('#ep-view').innerHTML = SVG(IC[style], 17);
  $('#ep-sort').innerHTML = SVG(IC.sort, 17);
  box.className = 'side-eps as-' + style;
  box.innerHTML = nums.map(n => {
    const st = prog[n], cls = (n === EP ? 'on ' : '') + (st && st.d ? 'fin' : ''), bar = `<span class="se-prog"><i style="width:${EpProg.width(st, n === EP)}%"></i></span>`;
    if (style === 'grid') return `<button class="${cls}" data-ep="${n}">${n}${bar}</button>`;
    const e = epTitleOf(n), t = esc(e.title || 'Episode ' + n);
    const thumb = style === 'list' ? `<span class="se-thumb">${(e.thumb || fb) ? `<img loading="lazy" src="${esc(e.thumb || fb)}" alt="" ${e.thumb && fb ? `onerror="this.onerror=null;this.src='${esc(fb)}'"` : ''}>` : ''}</span>` : '';
    return `<button class="${cls}" data-ep="${n}">${thumb}<span class="se-body"><em>Episode ${n}</em><b>${t}</b></span>${bar}</button>`;
  }).join('');
  $$('button', box).forEach(b => b.onclick = () => gotoEp(+b.dataset.ep));
  const active = $('button.on', box);
  if (active && matchMedia('(min-width:1000px)').matches) active.scrollIntoView({ block: 'nearest' });
}

/* ---------- Seasons / related (switch) and recommendations (own section), loaded after the player starts ---------- */
let EXTRAS = null, SEASONS = null;
async function loadExtras() {
  const id = MEDIA.id;
  if (EXTRAS && EXTRAS.id === id) { paintExtras(); return; }
  EXTRAS = { id, M: null };
  SEASONS = null;
  Api.seasonChain(id).then(list => { if (!MEDIA || MEDIA.id !== id) return; SEASONS = list || []; paintExtras(); }).catch(() => { SEASONS = []; paintExtras(); });
  try { const { Media } = await Api.anime(id); if (EXTRAS.id === id) EXTRAS.M = Media; } catch { }
  if (MEDIA && MEDIA.id === id) paintExtras();
}
function paintExtras() {
  const M = EXTRAS && EXTRAS.M; if (!M && SEASONS === null) return;
  const rel = ((M && M.relations && M.relations.edges) || []).filter(e => e.node);
  const recs = ((M && M.recommendations && M.recommendations.nodes) || []).map(n => n.mediaRecommendation).filter(Boolean).filter(hasEpisodes);
  const seasons = SEASONS && SEASONS.length >= 2 ? SEASONS : [];

  let n = 0;
  const seasonHTML = seasons.length ? `<section class="wp-seasons"><h3>Seasons</h3><div class="ss-list">${seasons.map(x => {
    const tv = ['TV', 'TV_SHORT', 'ONA'].includes(x.format);
    const label = tv ? 'Season ' + (++n) : x.format === 'MOVIE' ? 'Movie' : 'OVA';
    const soon = x.status === 'NOT_YET_RELEASED';
    const meta = [x.seasonYear || (x.startDate && x.startDate.year) || '', soon ? 'Upcoming' : x.episodes ? x.episodes + ' eps' : ''].filter(Boolean).join(' \u00b7 ');
    const cur = x.id === MEDIA.id;
    return `<a class="ss-item${cur ? ' on' : ''}${soon ? ' soon' : ''}" ${soon ? '' : `href="watch.html?id=${x.id}&ep=1"`} ${cur ? 'aria-current="page"' : ''}>
      <img loading="lazy" src="${esc((x.coverImage && x.coverImage.large) || '')}" alt="">
      <span><em>${esc(label)}</em><b>${esc(titleOf(x))}</b><i>${esc(meta)}</i></span></a>`;
  }).join('')}</div></section>` : '';
  const relHTML = rel.length ? `${seasons.length ? '<h3 class="wp-rel-h">Related</h3>' : ''}<div class="grid">${rel.map(e => {
    const nd = e.node, rt = nd.status === 'NOT_YET_RELEASED' ? null : playTarget(nd), rtitle = titleOf(nd);
    return `<article class="card"><div class="card-media">
      <img loading="lazy" src="${esc((nd.coverImage && nd.coverImage.large) || '')}" alt="">
      ${hitHTML(`anime.html?id=${nd.id}`, rtitle)}${rt ? playBtnHTML(rt.href, rt.label) : ''}
      <span class="card-tags"><span class="tag fmt">${esc(e.relationType.replace(/_/g, ' ').toLowerCase())}</span></span>
    </div><a class="card-title" href="anime.html?id=${nd.id}">${esc(rtitle)}</a></article>`;
  }).join('')}</div>` : '';

  $('#p-rel').innerHTML = (seasonHTML + relHTML) || '<p class="wp-empty">No related titles.</p>';
  $('#p-rec').innerHTML = recs.length ? `<div class="grid">${recs.map(cardHTML).join('')}</div>` : '';
  $('#wp-recs').hidden = !recs.length;
  const relTab = $('.dp-tab[data-p="rel"]');
  relTab.disabled = !(seasonHTML || relHTML);
  relTab.textContent = seasons.length || !relHTML ? 'Seasons' : 'Related';   // Titles with no season chain only have related shows to show
  if (window.placeTabInk) placeTabInk();
}

function gotoEp(n) {
  const total = epCountOf(MEDIA);
  if (n < 1 || n > total) return;
  EP = n;
  autoTried = 0;
  syncURL();
  buildPage();
  window.scrollTo({ top: 0, behavior: scrollMode() });
}

/* ---------- Progress for embedded players ---------- */
let _estT = 0, _estAcc = 0, _realAt = 0, _playing = null;
function paintLive(st) {
  const b = $(`#side-eps button[data-ep="${EP}"]`);
  if (b && st) EpProg.paint(b, st, true);
}
function trackProgress(d, ev) {
  if (!MEDIA) return;
  if (/^(pause|paused)$/.test(ev) || /complete|ended|finish/.test(ev)) _playing = false;
  else if (/^(play|playing)$/.test(ev)) _playing = true;
  if (/complete|ended|finish/.test(ev)) { paintLive(EpProg.record(MEDIA.id, EP, 100)); EpProg.flush(); return; }
  const p = EpProg.fromMessage(d);
  if (p == null) return;
  _realAt = Date.now();
  paintLive(EpProg.record(MEDIA.id, EP, p));
}
/* Some players never report a position: then count the seconds the episode has been playing, never past 94% (only the end of the video marks it watched) */
function startEstimate() {
  clearInterval(_estT);
  _estAcc = 0; _realAt = 0; _playing = null;
  _estT = setInterval(() => {
    if (!MEDIA || !playerReady || document.hidden || _playing === false || VP) return;
    if (currentServer().kind !== 'embed') return;
    if (Date.now() - _realAt < 6000) return;
    _estAcc++;
    const p = Math.min(94, _estAcc / ((MEDIA.duration || 24) * 60) * 100);
    paintLive(EpProg.record(MEDIA.id, EP, p, { raiseOnly: true }));
  }, 1000);
}

function onPlayerMessage(e) {
  if (VP) return;
  if (e.origin && !PROVIDER_HOSTS.some(h => String(e.origin).includes(h))) return;

  let d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
  if (!d || typeof d !== 'object') return;

  const ev = String(d.event || d.type || d.name || '').toLowerCase();

  const fr = $('#player iframe');
  if (!fr || !e.source || e.source === fr.contentWindow) trackProgress(d, ev);   // Only the player on screen counts, never one that was just replaced

  if (ev === 'complete' || ev === 'ended') {
    if (typeof Mal !== 'undefined') Mal.track(MEDIA, EP);
    if ($('#autonext').checked) gotoEp(EP + 1);
    return;
  }

  if (/error|fail/.test(ev)) { failServer(); return; }

  if (/ready|playing|play|loaded|canplay/.test(ev)) {
    playerReady = true;
    clearTimeout(readyTimer);
    autoTried = 0;
    markAlive(currentServer().id);
    if (LANG === 'dub') { Dub.clear(MEDIA.id, EP); Dub.clearSeries(MEDIA.id); paintDub(); }
    paintServers();
    $('#player-loading')?.remove(); $('.player-error')?.remove();
  }
}

/* Episode keys for embedded players (our own player handles its keys itself: arrows seek, N and P change episode) */
document.addEventListener('keydown', e => {
  const t = e.target.tagName;
  if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA' || e.target.isContentEditable) return;
  if (!MEDIA || VP || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowRight' || e.key === 'n') gotoEp(EP + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'p') gotoEp(EP - 1);
});

document.addEventListener('DOMContentLoaded', initWatch);
