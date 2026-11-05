const Q = new URLSearchParams(location.search);
const WID = Number(Q.get('id'));
let EP = Math.max(1, Number(Q.get('ep')) || 1);
const HAS_LANG = ['sub', 'dub'].includes(Q.get('lang'));
let LANG = HAS_LANG ? Q.get('lang') : localStorage.getItem('as_lang') || Settings.get().audio;
const syncURL = () => history.replaceState(null, '', `watch.html?id=${WID}&ep=${EP}${HAS_LANG ? '&lang=' + LANG : ''}`);
let PREF_LANG = LANG;
let MEDIA = null;

const SERVERS = [
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
];

const PROVIDER_HOSTS = SERVERS.map(s => s.host);

const OLD_SERVER_MAP = { ani: 'anixo', mal: 'anixo-mal' };
let SERVER = (() => {
  const saved = localStorage.getItem('as_server');
  if (saved && SERVERS.some(s => s.id === saved)) return saved;
  if (saved && OLD_SERVER_MAP[saved]) return OLD_SERVER_MAP[saved];
  return SERVERS[0].id;
})();

const DEAD_TTL = 30 * 60e3;
const deadMap = () => { try { return JSON.parse(localStorage.getItem('as_dead_servers')) || {}; } catch { return {}; } };
const deadKey = id => id + ':' + LANG;                       // A server can fail for dub and still work for sub
const isDead = id => { const d = deadMap()[deadKey(id)]; return !!d && d > Date.now(); };
function markDead(id) { const d = deadMap(); d[deadKey(id)] = Date.now() + DEAD_TTL; localStorage.setItem('as_dead_servers', JSON.stringify(d)); }
function markAlive(id) { const d = deadMap(); if (d[deadKey(id)]) { delete d[deadKey(id)]; localStorage.setItem('as_dead_servers', JSON.stringify(d)); } }

const currentServer = () => SERVERS.find(s => s.id === SERVER) || SERVERS[0];
const labelOf = id => (SERVERS.find(s => s.id === id) || {}).label || id;
const usable = s => (s.key === 'mal' ? !!MEDIA.idMal : !!MEDIA.id);
function liveServers() {
  const u = SERVERS.filter(usable);
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
      $$('.player-bar, .side-col').forEach(el => { el.style.display = 'none'; });
      return;
    }
    if (EP > epCountOf(MEDIA)) { EP = epCountOf(MEDIA); syncURL(); }
    document.title = `${titleOf(MEDIA)} - Episode ${EP} - Amnestream`;
    buildPage();
  } catch (err) {
    $('#player').innerHTML = `<div class="player-fallback">${esc(err.message)}</div>`;
  }
}

function buildPage() {
  const total = epCountOf(MEDIA);
  LANG = PREF_LANG === 'dub' && Dub.missing(MEDIA.id, EP) ? 'sub' : PREF_LANG;
  $$('#lang-seg button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));

  $('#w-title').textContent = titleOf(MEDIA);
  $('#w-sub').innerHTML =
    `Episode <strong>${EP}</strong> of ${total} &middot; ${esc(fmtLabel(MEDIA))} &middot; ` +
    `<span class="muted">${esc(statusLabel(MEDIA))}</span>`;
  $('#info-link').href = 'anime.html?id=' + MEDIA.id;

  $$('#lang-seg button').forEach(b => {
    b.classList.toggle('on', b.dataset.lang === LANG);
    b.onclick = () => setLang(b.dataset.lang);
  });
  paintDub();

  buildServerOptions();
  $('#server').onchange = () => setServer($('#server').value);

  $('#reload-player').onclick = () => { autoTried = 0; mountPlayer(); };

  $('#prev-ep').disabled = EP <= 1;
  $('#next-ep').disabled = EP >= total;
  $('#prev-ep').onclick = () => gotoEp(EP - 1);
  $('#next-ep').onclick = () => gotoEp(EP + 1);

  renderSideEps(total);
  if (!_artAsked) {
    _artAsked = true;
    Api.episodeArt(MEDIA.id).then(art => {
      let changed = false; epTitleOf(1);
      Object.keys(art).forEach(n => {
        const cur = _epTitles[n] || (_epTitles[n] = { title: '', thumb: '' });
        if (!cur.thumb && art[n].thumb) { cur.thumb = art[n].thumb; changed = true; }
        if (!cur.title && art[n].title) { cur.title = art[n].title; changed = true; }
      });
      if (changed) renderSideEps(epCountOf(MEDIA));
    }).catch(() => {});
  }
  renderSideSeasons();
  mountPlayer();
  checkDub();
  mountComments();
  Store.saveProgress(MEDIA, EP);
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

/* Options are built here so watch.html needs no edit */
function buildServerOptions() {
  const sel = $('#server');
  sel.innerHTML = SERVERS.filter(usable).map(s =>
    `<option value="${s.id}">${esc(s.label)}${isDead(s.id) ? ' (failed)' : ''}</option>`
  ).join('');
  sel.value = SERVER;
}

function embedURL() {
  const s = currentServer();
  const id = s.key === 'mal' ? MEDIA.idMal : MEDIA.id;
  if (!id) return '';
  return s.url(MEDIA.id, MEDIA.idMal, EP, LANG);
}

function setLang(l) {
  if (l === 'dub' && Dub.missing(MEDIA.id, EP)) { toast('No dub for this episode.'); return; }
  LANG = PREF_LANG = l;
  autoTried = 0;
  localStorage.setItem('as_lang', LANG);
  if (HAS_LANG) syncURL();
  $$('#lang-seg button').forEach(x => x.classList.toggle('on', x.dataset.lang === LANG));
  mountPlayer();
}
function setServer(v) {
  SERVER = v;
  localStorage.setItem('as_server', SERVER);
  autoTried = 0;
  buildServerOptions();
  mountPlayer();
}

/* Cross out DUB when this episode's dub is known not to play */
function paintDub() {
  const no = MEDIA && Dub.missing(MEDIA.id, EP), b = $('#lang-seg button[data-lang="dub"]');
  if (b) { b.classList.toggle('no-dub', no); b.setAttribute('aria-disabled', String(no)); b.title = no ? 'No dub found for this episode' : ''; }
}

/* Finds out early whether this episode has a dub so DUB is crossed out before anyone clicks it */
async function checkDub() {
  const id = MEDIA.id, ep = EP;
  const r = await Dub.probe(id, ep);
  if (!MEDIA || id !== MEDIA.id || ep !== EP) return;
  if (r === 'no') { Dub.mark(id, ep); if (ep === 1) Dub.markSeries(id); }
  else if (r === 'yes') { Dub.clear(id, ep); if (ep === 1) Dub.clearSeries(id); }
  paintDub();
  if (r === 'no' && LANG === 'dub') dubMissing();
}
function dubMissing() {                                              // Nothing to play in dub: say so and fall back to sub
  clearTimeout(loadTimer); clearTimeout(readyTimer);
  Dub.mark(MEDIA.id, EP); paintDub();
  LANG = 'sub';
  $$('#lang-seg button').forEach(x => x.classList.toggle('on', x.dataset.lang === LANG));
  toast('No dub for this episode, switched to Sub.');
  mountPlayer();
}

let loadTimer, readyTimer;

/* In-player message instead of a provider's raw error page */
function showPlayerError(text = 'Server error. Please swap to another server.') {
  clearTimeout(loadTimer); clearTimeout(readyTimer);
  const box = $('#player'); if (!box) return;
  $('#player-loading')?.remove(); $('.player-error', box)?.remove();
  const el = document.createElement('div');
  el.className = 'player-error';
  el.innerHTML = `<div><p>${esc(text)}</p>
    <div class="pe-actions"><button class="btn btn-primary" id="pe-swap">Swap server</button><button class="btn btn-ghost" id="pe-reload">Reload</button></div></div>`;
  box.appendChild(el);
  $('#pe-swap', el).onclick = () => { const n = nextServerId(SERVER); if (n && n !== SERVER) setServer(n); else mountPlayer(); };
  $('#pe-reload', el).onclick = () => { autoTried = 0; mountPlayer(); };
}

/* A server did not work: bench it and move to the next one right away; when none is left, say so */
function failServer() {
  clearTimeout(readyTimer); clearTimeout(loadTimer);
  const s = currentServer();
  markDead(s.id);
  buildServerOptions();
  const nxt = nextServerId(s.id);
  const limit = LANG === 'dub' ? 3 : SERVERS.filter(usable).length;
  if (nxt && nxt !== s.id && autoTried < limit - 1) {
    autoTried++;
    SERVER = nxt;
    localStorage.setItem('as_server', SERVER);
    buildServerOptions();
    toast(`Switching to ${labelOf(nxt)}...`);
    mountPlayer();
    return;
  }
  if (LANG === 'dub') { dubMissing(); return; }
  showPlayerError();
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

let mountSeq = 0;
function mountPlayer() {
  clearTimeout(loadTimer); clearTimeout(readyTimer);
  playerReady = false;
  const seq = ++mountSeq, url = embedURL();

  $('#player').innerHTML = `
    <iframe src="${url}"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
    <div class="player-loading" id="player-loading"><span class="spinner"></span>Loading player...</div>`;
  if (url) probeEmbed(url, seq);

  readyTimer = setTimeout(() => { if (seq === mountSeq && !playerReady) failServer(); }, 7000);
}

let _epTitles = null, _artAsked = false;
function epTitleOf(n) {
  if (!_epTitles) {
    _epTitles = {};
    ((MEDIA && MEDIA.streamingEpisodes) || []).forEach(e => {
      const x = /(\d+)\s*[-\u2013:.]\s*(.*)$/.exec(e.title || '') || /Episode\s+(\d+)/i.exec(e.title || '');
      if (x && !_epTitles[+x[1]]) _epTitles[+x[1]] = { title: x[2] || '', thumb: e.thumbnail };
    });
  }
  return _epTitles[n] || {};
}
function renderSideEps(total) {
  const box = $('#side-eps'), s = Settings.get();
  const style = ['list', 'compact', 'grid'].includes(s.epStyle) ? s.epStyle : 'grid';
  const seen = new Set((Store.seen()[MEDIA.id]) || []);
  const fb = bannerOf(MEDIA) || thumbOf(MEDIA);
  let nums = Array.from({ length: total }, (_, i) => i + 1);
  if (s.epOrder === 'desc') nums.reverse();
  box.className = 'side-eps as-' + style;
  box.innerHTML = nums.map(n => {
    const cls = (n === EP ? 'on ' : '') + (seen.has(n) ? 'done' : '');
    if (style === 'grid') return `<button class="${cls}" data-ep="${n}">${n}</button>`;
    const e = epTitleOf(n), t = esc(e.title || 'Episode ' + n);
    const thumb = style === 'list' ? `<span class="se-thumb">${(e.thumb || fb) ? `<img loading="lazy" src="${esc(e.thumb || fb)}" alt="" ${e.thumb && fb ? `onerror="this.onerror=null;this.src='${esc(fb)}'"` : ''}>` : ''}</span>` : '';
    return `<button class="${cls}" data-ep="${n}">${thumb}<span class="se-body"><em>Episode ${n}</em><b>${t}</b></span><i class="se-state">${seen.has(n) ? '\u2713' : ''}</i></button>`;
  }).join('');
  $$('button', box).forEach(b => b.onclick = () => gotoEp(+b.dataset.ep));
  const active = $('button.on', box);
  if (active) active.scrollIntoView({ block: 'nearest' });
}

let SEASONS = null;
function renderSideSeasons() {
  const box = $('#side-seasons'); if (!box) return;
  if (SEASONS === null) {
    SEASONS = [];
    Api.seasonChain(MEDIA.id).then(list => { SEASONS = list || []; renderSideSeasons(); }).catch(() => {});
    return;
  }
  if (SEASONS.length < 2) { box.hidden = true; return; }
  let n = 0;
  box.innerHTML = `<h3>Seasons</h3><div class="ss-list">${SEASONS.map(x => {
    const tv = ['TV', 'TV_SHORT', 'ONA'].includes(x.format);
    const label = tv ? 'Season ' + (++n) : x.format === 'MOVIE' ? 'Movie' : 'OVA';
    const soon = x.status === 'NOT_YET_RELEASED';
    const meta = [x.seasonYear || x.startDate?.year || '', soon ? 'Upcoming' : x.episodes ? x.episodes + ' eps' : ''].filter(Boolean).join(' \u00b7 ');
    const cur = x.id === MEDIA.id;
    return `<a class="ss-item${cur ? ' on' : ''}${soon ? ' soon' : ''}" ${soon ? '' : `href="watch.html?id=${x.id}&ep=1"`} ${cur ? 'aria-current="page"' : ''}>
      <img loading="lazy" src="${esc(x.coverImage?.large || '')}" alt="">
      <span><em>${esc(label)}</em><b>${esc(titleOf(x))}</b><i>${esc(meta)}</i></span></a>`;
  }).join('')}</div>`;
  box.hidden = false;
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

function onPlayerMessage(e) {
  if (e.origin && !PROVIDER_HOSTS.some(h => String(e.origin).includes(h))) return;

  let d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
  if (!d || typeof d !== 'object') return;

  const ev = String(d.event || d.type || d.name || '').toLowerCase();

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
    $('#player-loading')?.remove(); $('.player-error')?.remove();
  }
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (!MEDIA) return;
  if (e.key === 'ArrowRight' || e.key === 'n') gotoEp(EP + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'p') gotoEp(EP - 1);
});

document.addEventListener('DOMContentLoaded', initWatch);