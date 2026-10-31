/* Settings: everything saves to this device as you change it.
   Two layouts share the same settings and controls: Modern (the Stage: click the part of a miniature site you want to change) and Classic (stacked panels with a live preview). */

const THEMES = [['sakura','Atlas','#181c25','#9db4ff'],['midnight','Midnight','#0e1420','#60a5fa'],['crimson','Crimson','#1a0d0f','#f43f5e'],
  ['emerald','Emerald','#0c1713','#34d399'],['amoled','AMOLED','#000','#ffffff'],['sunset','Sunset','#1a100a','#fb923c'],
  ['amber','Amber','#191309','#fbbf24'],['galaxy','Galaxy','#130d1d','#a78bfa'],['ocean','Ocean','#0a161b','#22d3ee']];
const ACCENTS = ['#9db4ff', '#f472b6', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#a78bfa', '#f43f5e'];

const ALL_SECTIONS = [
  { id: 'playback', name: 'Playback', sub: 'What happens when you press play', ic: 'play', g: 'rose', items: [
    { t: 'toggle', k: 'autonext', ic: 'skip', n: 'Autonext', d: 'Play the next episode when this one ends' },
    { t: 'toggle', k: 'resume', ic: 'clock', n: 'Resume where you left off', d: 'The Watch button on details pages continues from your last episode' },
    { t: 'seg', k: 'audio', ic: 'mic', n: 'Default audio', d: 'Japanese with subtitles, or the English dub when there is one', full: 1, opts: [['sub', 'Sub'], ['dub', 'Dub']] },
  ] },
  { id: 'appearance', name: 'Appearance', sub: 'Colours, titles, posters and episode lists', ic: 'palette', g: 'purple', items: [
    { t: 'themes', ic: 'palette', n: 'Theme', d: 'Colour scheme for the whole site', kw: 'color colour scheme dark light', full: 1 },
    { t: 'accent', ic: 'sliders', n: 'Accent colour', d: 'Buttons, highlights and progress. Overrides the theme\'s accent', kw: 'color colour custom highlight', full: 1 },
    { t: 'seg', k: 'titleLang', ic: 'lang', n: 'Title language', d: 'How anime names show across the site', full: 1, opts: [['english', 'English'], ['romaji', 'Romaji']] },
    { t: 'seg', k: 'cardSize', ic: 'grid', n: 'Poster size', d: 'Size of posters in grids and rows on computers. Phones always show three across', full: 1, opts: [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']] },
    { t: 'seg', k: 'epOrder', ic: 'sort', n: 'Episode order', d: 'Which end of the episode list comes first', full: 1, opts: [['asc', 'First to latest'], ['desc', 'Latest first']] },
    { t: 'seg', k: 'epStyle', ic: 'grid', n: 'Episode list style', d: 'On details pages', full: 1, opts: [['list', 'Cards'], ['compact', 'Compact'], ['grid', 'Numbers']] },
    { t: 'toggle', k: 'continueRow', ic: 'clock', n: 'Continue watching row', d: 'Show your recent episodes at the top of the homepage' },
    { t: 'toggle', k: 'hoverTrailer', ic: 'film', n: 'Trailer preview on hover', d: 'Hover a poster for a floating card that autoplays the trailer (computers only)' },
    { t: 'toggle', k: 'reduceMotion', ic: 'ghost', n: 'Reduce motion', d: 'Turn off animations and transitions across the site' },
  ] },
  { id: 'privacy', name: 'Content and privacy', sub: 'What you see and what gets saved', ic: 'shield', g: 'green', items: [
    { t: 'toggle', k: 'includeAdult', ic: 'shield', n: 'Show 18+ titles', d: 'Include adult-rated anime in Browse, search, the home page and the schedule', kw: 'adult 18 nsfw hentai explicit mature all titles' },
    { t: 'toggle', k: 'incognito', ic: 'eye', n: 'Incognito mode', d: 'Pause watch history and activity tracking' },
    { t: 'toggle', k: 'hideSpoilers', ic: 'eye', n: 'Hide spoilers', d: 'Blur thumbnails and titles of episodes you haven\'t watched yet' },
  ] },
  { id: 'sync', name: 'Sync and devices', sub: 'Keep Continue watching the same everywhere', ic: 'cloud', g: 'blue', items: [
    { t: 'syncstatus', n: 'Cloud sync', d: 'Your list, progress and history follow your account', kw: 'cloud sync devices account continue watching', full: 1 },
    { t: 'btn', ic: 'link', n: 'Sync code', d: 'Copy a code to move your list and history to another device without an account', label: 'Copy code', act: 'synccopy', full: 1 },
    { t: 'btn', ic: 'link', n: 'Use a sync code', d: 'Paste a code from another device. It is merged with what you have here', label: 'Paste code', act: 'syncpaste', full: 1 },
  ] },
  { id: 'account', name: 'Account', sub: 'Your public profile and password', ic: 'user', g: 'gray', items: [
    { t: 'account', n: 'Profile', d: 'Display name, username, avatar and bio', kw: 'account profile name username bio avatar picture', full: 1 },
    { t: 'btn', ic: 'shield', n: 'Change password', d: 'Enter your current password, then choose a new one (at least 6 characters)', label: 'Change', act: 'changepw', kw: 'password security login', full: 1 },
  ] },
  { id: 'data', name: 'Data and storage', sub: 'Backups, what this device stores and cleanup', ic: 'database', g: 'slate', items: [
    { t: 'storage', n: 'Storage on this device', d: 'What Amnestream keeps in this browser', kw: 'storage cache space size', full: 1 },
    { t: 'btn', ic: 'refresh', n: 'Clear cached data', d: 'Removes saved search results and cached posters. Your list, history and settings stay', label: 'Clear cache', act: 'clearcache', full: 1, kw: 'cache storage free space' },
    { t: 'btn', ic: 'download', n: 'Backup', d: 'Save your settings, list and history to a file', label: 'Export', act: 'export', full: 1 },
    { t: 'btn', ic: 'download', n: 'Restore backup', d: 'Load a file exported from here', label: 'Import', act: 'import', full: 1 },
    { t: 'btn', ic: 'clock', n: 'Clear watch history', d: 'Empties Continue watching and resume points. Your list stays', label: 'Clear', act: 'clearhist', full: 1 },
    { t: 'btn', ic: 'trash', n: 'Reset settings', d: 'Everything on the Settings page back to defaults', label: 'Reset', act: 'reset', full: 1 },
    { t: 'btn', ic: 'trash', n: 'Delete all local data', d: 'Removes profile, list, history and settings from this browser', label: 'Delete', act: 'wipe', full: 1, danger: 1 },
  ] },
  { id: 'about', name: 'About and shortcuts', sub: 'Keyboard shortcuts and the fine print', ic: 'info', g: 'slate', items: [
    { t: 'keys', n: 'Keyboard shortcuts', d: 'Faster ways around the site', kw: 'keyboard shortcuts keys hotkeys', full: 1 },
    { t: 'info', n: 'About', d: 'Settings are stored on this device', kw: 'about local storage browser', full: 1 },
    { t: 'link', ic: 'info', n: 'DMCA and copyright', d: 'How copyright owners can send a takedown notice', label: 'Read', href: 'dmca.html', kw: 'dmca copyright takedown legal disclaimer', full: 1 },
  ] },
];
/* Account section is for signed-in users only */
const SECTIONS = ALL_SECTIONS.filter(s => s.id !== 'account' || !!Auth.session());
let CUR = new URLSearchParams(location.search).get('s') || 'playback';
let Q = '';   // Text in "Search settings"
const isModern = () => Settings.get().uiMode !== 'classic';

const hayOf = (it, sec) => ((it.n || '') + ' ' + (it.d || '') + ' ' + (it.kw || '') + ' ' + sec.name).toLowerCase();
/* What a segmented control currently shows (default audio can also change from the player, saved as as_lang) */
const segValue = (it, s) => it.k === 'audio' ? (localStorage.getItem('as_lang') || s.audio) : s[it.k];

/* ---------- Pieces shared by both layouts ---------- */
const ago = t => {
  if (!t) return 'never';
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago';
};
const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
function storageStats() {
  const size = k => { try { return ((k.length + (localStorage.getItem(k) || '').length) * 2); } catch { return 0; } };
  const keys = Object.keys(localStorage);
  const sum = list => list.reduce((n, k) => n + size(k), 0);
  const cache = keys.filter(k => k.startsWith('as_plan:')).reduce((n, k) => n + size(k), 0) +
    Object.keys(sessionStorage).filter(k => k.startsWith('al:')).reduce((n, k) => n + (k.length + (sessionStorage.getItem(k) || '').length) * 2, 0);
  return [
    ['Watch history', sum(['as_progress', 'as_seen', 'as_activity'])],
    ['List and favourites', sum(['as_list', 'as_fav'])],
    ['Settings and profile', sum(['as_settings', 'as_user', 'as_lang', 'as_server', 'as_browse_last', 'as_browse_presets', 'as_sync', 'as_nodub'])],
    ['Cached data', cache],
  ];
}
function syncStatusHTML() {
  const me = Auth.session();
  if (!me) return `<div class="sy-line"><span class="sy-dot off"></span><div><strong>Not signed in</strong><span class="d">Log in to keep your list and Continue watching the same on your phone and computer.</span></div></div><button class="btn-sm" data-act="login">Log in</button>`;
  if (Sync.off === 'missing') return `<div class="sy-line"><span class="sy-dot bad"></span><div><strong>Cloud sync isn't set up yet</strong><span class="d">The sync table is missing on the server. Run supabase/sync.sql once in the Supabase SQL editor.</span></div></div>`;
  const at = Number(localStorage.getItem('as_sync_at')) || 0;
  return `<div class="sy-line"><span class="sy-dot ${at ? 'ok' : 'wait'}"></span><div><strong>${at ? 'Synced ' + ago(at) : 'Waiting for the first sync'}</strong><span class="d">Signed in as @${esc(me.username)}. Checks when a page opens and saves a moment after you change something.</span></div></div><button class="btn-sm" data-act="syncnow">Sync now</button>`;
}
function storageHTML() {
  const st = storageStats(), max = Math.max(1, ...st.map(x => x[1]));
  return `<div class="st-list">${st.map(([n, b]) => `<div class="st-row"><span>${n}</span><i><b style="width:${Math.max(2, Math.round(b / max * 100))}%"></b></i><em>${kb(b)}</em></div>`).join('')}</div>`;
}
const KEYS_HELP = [['/', 'Open search'], ['Esc', 'Close search, menus and pop-ups'], ['Enter', 'Open the highlighted search result'], ['←  →', 'Previous or next episode in the episode preview'], ['↑  ↓', 'Move through search results and menus']];
const keysHTML = () => `<dl class="keys">${KEYS_HELP.map(([k, d]) => `<div><dt><kbd>${k}</kbd></dt><dd>${d}</dd></div>`).join('')}</dl>`;
function accountFormHTML() {
  const u = User.get();
  return `<div class="acct-av">${avatarHTML(78)}</div>
    <div class="set-col">
      <div class="acct-two">
        <label class="set-lbl">Display name<input class="set-in" id="a-name" value="${esc(u.name)}" maxlength="30"></label>
        <label class="set-lbl">Username<input class="set-in" id="a-user" value="${esc(u.username)}" maxlength="20"></label>
      </div>
      ${AvatarPicker.html('a-avatar', u.avatar, u.name)}
      <label class="set-lbl">Bio<textarea class="set-in bio-in" id="a-bio" maxlength="${BIO_MAX}" rows="2">${esc(bioFit(u.bio))}</textarea><span class="bio-count">${bioFit(u.bio).length}/${BIO_MAX}</span></label>
      <div><button class="btn btn-primary" id="a-save">Save changes</button></div>
    </div>`;
}
const aboutHTML = () => `<ul class="about-list">
  <li>Settings, list and history are stored <b>on this device</b> (browser storage).</li>
  <li>Your account (login, profile and, once signed in, your list and progress) is stored online so it works on every device.</li>
  <li>${SITE_NAME} doesn't host any video files; it links to third-party sources.</li>
</ul>`;

/* The control on the right of a simple row, same markup in both layouts (CSS decides how it looks) */
function ctlHTML(it, s) {
  switch (it.t) {
    case 'toggle': return `<button class="toggle ${s[it.k] ? 'on' : ''}" data-k="${it.k}" role="switch" aria-checked="${!!s[it.k]}" aria-label="${it.n}"><span>${s[it.k] ? 'On' : 'Off'}</span></button>`;
    case 'seg': { const cur = segValue(it, s), i = Math.max(0, it.opts.findIndex(o => o[0] === cur));
      return `<div class="segc" style="--n:${it.opts.length};--i:${i}">${it.opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-k="${it.k}" data-v="${v}">${l}</button>`).join('')}</div>`; }
    case 'btn': return `<button class="btn-sm ${it.danger ? 'btn-danger' : ''}" data-act="${it.act}">${it.label}</button>`;
    case 'link': return `<a class="btn-sm" href="${it.href}">${it.label}</a>`;
  }
  return '';
}
function themesHTML(s) {
  return `<div class="themes">${THEMES.map(([id, n, b, a]) =>
    `<button class="theme-opt ${s.theme === id ? 'on' : ''}" data-theme-pick="${id}" style="--tb:${b};--ta:${a}"><i></i><em class="tm-bar"></em>${n}</button>`).join('')}</div>`;
}
function accentHTML(s) {
  const cur = (s.accent || '').toLowerCase();
  return `<div class="accents">${ACCENTS.map(c => `<button class="acc-dot ${cur === c ? 'on' : ''}" data-accent="${c}" style="--c:${c}" aria-label="Accent ${c}"></button>`).join('')}
    <label class="acc-custom ${cur && !ACCENTS.includes(cur) ? 'on' : ''}" title="Pick any colour"><input type="color" id="acc-pick" value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : '#9db4ff'}"><span>Custom</span></label>
    <button class="btn-sm" data-accent="" ${cur ? '' : 'disabled'}>Use theme colour</button></div>`;
}
/* Body of any item that is more than a label and a control */
function bodyHTML(it, s) {
  switch (it.t) {
    case 'themes': return themesHTML(s);
    case 'accent': return accentHTML(s);
    case 'syncstatus': return `<div class="sy" id="sync-status">${syncStatusHTML()}</div>`;
    case 'storage': return `<div id="storage-box">${storageHTML()}</div>`;
    case 'keys': return keysHTML();
    case 'info': return aboutHTML();
    case 'account': return `<div class="acct">${accountFormHTML()}</div>`;
  }
  return '';
}
const BODY_TYPES = ['themes', 'accent', 'syncstatus', 'storage', 'keys', 'info', 'account'];

/* ---------- Layout switch (both layouts) ---------- */
function uiSwitchHTML() {
  const m = isModern();
  return `<div class="uiswitch" role="group" aria-label="Page layout"><span class="uis-l">Layout</span>
    <div class="segc" style="--n:2;--i:${m ? 0 : 1}"><button data-ui-pick="modern" class="${m ? 'on' : ''}">Modern</button><button data-ui-pick="classic" class="${m ? '' : 'on'}">Classic</button></div></div>`;
}
function wireSwitch() {
  $$('[data-ui-pick]').forEach(b => b.onclick = () => { if (Settings.get().uiMode === b.dataset.uiPick) return; Settings.set('uiMode', b.dataset.uiPick); document.body.classList.remove('stg-open'); render(); window.scrollTo({ top: 0 }); });
}

/* ---------- Classic layout (stacked panels, jump bar, live preview) ---------- */
function mRowHTML(it, sec) {
  const s = Settings.get();
  const hay = esc(hayOf(it, sec));
  if (BODY_TYPES.includes(it.t)) {
    const head = `<div class="mtxt"><strong>${it.n}</strong><span>${it.d || ''}</span></div>`;
    return `<div class="mrow stack ${it.t}" data-hay="${hay}">${head}${bodyHTML(it, s)}</div>`;
  }
  return `<div class="mrow ${it.danger ? 'danger' : ''}" data-hay="${hay}"><div class="mtxt"><strong>${it.n}</strong><span>${it.d || ''}</span></div>${ctlHTML(it, s)}</div>`;
}
function renderPanels() {
  $('#page').innerHTML = `<div class="mset">
    <header class="mset-top">
      <div><h1>Settings</h1><p>Changes save on this device as you make them.</p></div>
      ${uiSwitchHTML()}
    </header>
    <div class="mset-bar">
      <nav class="mset-jump" aria-label="Sections">${SECTIONS.map(s => `<a href="#sec-${s.id}" data-jump="${s.id}">${s.name}</a>`).join('')}</nav>
      <label class="mset-find">${icon('search', 14)}<input id="set-q" placeholder="Search settings" aria-label="Search settings" value="${esc(Q)}"></label>
    </div>
    <div class="mset-body">
      <div class="mset-main" id="mmain">${SECTIONS.map(sec => `
        <section class="mpanel" id="sec-${sec.id}" data-sec-id="${sec.id}">
          <h2>${sec.name}</h2><p class="msub">${sec.sub}</p>
          <div class="mrows">${sec.items.map(it => mRowHTML(it, sec)).join('')}</div>
        </section>`).join('')}
        <p class="mnone" id="mnone" hidden>No settings match that.</p>
      </div>
      <aside class="mset-prev" aria-label="Live preview"><div id="mprev"></div></aside>
    </div>
  </div>`;
  wireSwitch();
  wireRows();
  paintPrev();
  $('#set-q').oninput = e => { Q = e.target.value; filterPanels(); };
  $('#set-q').onkeydown = e => { if (e.key === 'Escape' && Q) { Q = ''; e.target.value = ''; filterPanels(); } };
  $$('[data-jump]').forEach(a => a.onclick = e => {
    e.preventDefault();
    const el = $('#sec-' + a.dataset.jump); if (!el) return;
    el.scrollIntoView({ behavior: Settings.get().reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '?s=' + a.dataset.jump);
  });
  if ('IntersectionObserver' in window) {                                // Highlight the jump chip of the section being read
    const io = new IntersectionObserver(es => {
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) $$('[data-jump]').forEach(a => a.classList.toggle('on', a.dataset.jump === vis.target.dataset.secId));
    }, { rootMargin: '-120px 0px -60% 0px' });
    $$('.mpanel').forEach(p => io.observe(p));
  }
  if (Q) filterPanels();
  const want = new URLSearchParams(location.search).get('s');
  if (want && $('#sec-' + want)) setTimeout(() => $('#sec-' + want).scrollIntoView({ block: 'start' }), 60);
}
function filterPanels() {
  const q = Q.trim().toLowerCase();
  let any = false;
  $$('.mpanel').forEach(p => {
    let n = 0;
    $$('.mrow', p).forEach(r => { const hit = !q || r.dataset.hay.includes(q); r.hidden = !hit; if (hit) n++; });
    p.hidden = !n; if (n) any = true;
  });
  $('#mnone').hidden = any;
}


/* ---------- Modern layout: the Stage ----------
   A miniature of the site that reacts to every setting. Click (or tap) the part you want to change and its controls open in the inspector. */
const REGIONS = [
  { id: 'look', name: 'Colours and motion', ic: 'palette', desc: 'The theme and accent colour used across the whole site, and whether things animate.', pick: it => ['themes', 'accent'].includes(it.t) || it.k === 'reduceMotion' },
  { id: 'titles', name: 'Titles', ic: 'lang', desc: 'How anime names are written on every page.', pick: it => it.k === 'titleLang' },
  { id: 'posters', name: 'Posters and rows', ic: 'grid', desc: 'Poster size, the Continue watching row and hover previews.', pick: it => ['cardSize', 'continueRow', 'hoverTrailer'].includes(it.k) },
  { id: 'episodes', name: 'Episode lists', ic: 'sort', desc: 'Order, style and spoilers on details pages.', pick: it => ['epOrder', 'epStyle', 'hideSpoilers'].includes(it.k) },
  { id: 'player', name: 'Playback', ic: 'play', desc: 'What happens when you press play and when an episode ends.', pick: it => ['autonext', 'resume', 'audio'].includes(it.k) },
  { id: 'privacy', name: 'Privacy', ic: 'shield', desc: 'What you see and what gets saved.', pick: it => ['includeAdult', 'incognito'].includes(it.k) },
  { id: 'you', name: 'Account and sync', ic: 'user', desc: 'Your account, password and keeping devices in step.', pick: it => ['syncstatus', 'account'].includes(it.t) || ['changepw', 'synccopy', 'syncpaste'].includes(it.act) },
  { id: 'data', name: 'Data and about', ic: 'database', desc: 'Backups, storage, shortcuts and the fine print.', pick: it => ['storage', 'keys', 'info', 'link'].includes(it.t) || ['clearcache', 'export', 'import', 'clearhist', 'reset', 'wipe'].includes(it.act) },
];
const OLD_SECTION = { playback: 'player', appearance: 'look', privacy: 'privacy', sync: 'you', account: 'you', data: 'data', about: 'data' };
let REG = '';
const regionItems = r => SECTIONS.flatMap(sec => sec.items.filter(r.pick).map(it => ({ it, sec })));
const STAGE_POSTERS = [['Delicious in Dungeon', 'Dungeon Meshi'], ['Kaiju No. 8', 'Kaijuu 8-gou'], ['Oshi no Ko', 'Oshi no Ko'], ['Solo Leveling', 'Ore dake Level Up na Ken'], ['Spy x Family', 'Spy x Family']];
/* The anime shown in the preview: real covers and a banner, a different set on every visit (Api.showcase). The plain placeholders above stay if it cannot load. */
let SHOW = null;
const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function pickShowcase(list) {
  let seen = []; try { seen = JSON.parse(sessionStorage.getItem('as_stg_seen')) || []; } catch { /* none yet */ }
  const ok = (list || []).filter(m => m && m.coverImage && m.coverImage.large);
  let pool = ok.filter(m => !seen.includes(m.id)); if (pool.length < 6) pool = ok;     // Skip what the last visits showed
  pool = shuffled(pool);
  const hero = pool.find(m => m.bannerImage) || pool[0];
  if (!hero) return null;
  const rail = pool.filter(m => m !== hero).slice(0, 5);
  try { sessionStorage.setItem('as_stg_seen', JSON.stringify([hero.id, ...rail.map(m => m.id), ...seen].slice(0, 36))); } catch { /* storage full */ }
  return { hero, rail };
}
function loadShowcase() {
  Api.showcase().then(list => { SHOW = pickShowcase(list); if (SHOW) { paintStage(); paintPrev(); } }).catch(() => { /* offline: the plain preview stays */ });
}
const STAGE_EPS = [[1, 'The Journey\'s End'], [2, 'It Didn\'t Have to Be Magic'], [3, 'Killing Magic'], [4, 'The Land Where Souls Rest'], [5, 'Phantoms of the Dead'], [6, 'Aura the Guillotine']];

function stageHTML() {
  const s = Settings.get(), u = User.get();
  const hot = (id, cls = '') => `class="stg-hot ${cls}${REG === id ? ' sel' : ''}" data-region="${id}"`;
  const tag = id => `<span class="stg-tag">${REGIONS.find(r => r.id === id).name}</span>`;
  const rom = s.titleLang === 'romaji';
  const aud = (localStorage.getItem('as_lang') || s.audio) === 'dub' ? 'Dub' : 'Sub';
  const per = s.cardSize === 'small' ? 5 : s.cardSize === 'large' ? 3 : 4;
  const hero = SHOW && SHOW.hero, heroImg = hero ? bannerOf(hero) : '';
  const heroChips = hero
    ? [scoreOf(hero) && '★ ' + scoreOf(hero), fmtLabel(hero), hero.episodes ? hero.episodes + ' eps' : statusLabel(hero)].filter(Boolean).map(c => `<span>${esc(c)}</span>`).join('')
    : '<span>★ 9.3</span><span>TV</span><span>28 eps</span>';
  const posters = SHOW ? SHOW.rail.map(m => ({ img: thumbOf(m), name: titleOf(m) })) : STAGE_POSTERS.map(([en, ro]) => ({ img: '', name: rom ? ro : en }));
  const eps = STAGE_EPS.slice(0, 5).map(([n, t]) => ({ n, t, seen: n <= 2 }));
  if (s.epOrder === 'desc') eps.reverse();
  const epHTML = s.epStyle === 'grid'
    ? `<div class="stg-nums">${STAGE_EPS.concat([[7], [8], [9], [10]]).slice(0, 10).sort((a, b) => s.epOrder === 'desc' ? b[0] - a[0] : a[0] - b[0]).map(([n]) => `<b class="${n <= 2 ? 'seen' : ''}">${n}</b>`).join('')}</div>`
    : s.epStyle === 'compact'
      ? `<ul class="stg-compact">${eps.map(e => `<li class="${e.seen ? 'seen' : ''}"><b>${e.n}</b><span class="${!e.seen && s.hideSpoilers ? 'blur' : ''}">${esc(e.t)}</span>${e.seen ? icon('check', 12) : ''}</li>`).join('')}</ul>`
      : `<ul class="stg-cards">${eps.slice(0, 3).map(e => `<li class="${e.seen ? 'seen' : ''}"><i class="${!e.seen && s.hideSpoilers ? 'blur' : ''}"></i><div><b>Episode ${e.n}</b><span class="${!e.seen && s.hideSpoilers ? 'blur' : ''}">${esc(e.t)}</span></div><em>${aud}</em></li>`).join('')}</ul>`;
  return `
  <div ${hot('look', 'stg-frame')}>${tag('look')}
    <div ${hot('you', 'stg-nav')}>${tag('you')}
      <b class="stg-logo">AMNE<i>STREAM</i></b><span class="stg-links"><em></em><em></em><em></em></span>
      <span class="stg-me">${s.incognito ? `<span class="stg-ghost-ic" title="Incognito">${icon('ghost', 14)}</span>` : ''}<u class="stg-av">${esc((u.name || 'G')[0].toUpperCase())}</u></span>
    </div>
    <div ${hot('titles', 'stg-hero')}>${tag('titles')}
      <div class="stg-hero-bg ${heroImg ? 'has-img ' : ''}${s.reduceMotion ? '' : 'move'}">${heroImg ? `<img src="${esc(heroImg)}" alt="" decoding="async">` : ''}</div>
      <div class="stg-hero-in">
        <h3>${hero ? esc(titleOf(hero)) : rom ? 'Sousou no Frieren' : 'Frieren: Beyond Journey\'s End'}</h3>
        <div class="stg-chips">${heroChips}${s.includeAdult ? '<span class="adult">18+ shown</span>' : ''}</div>
        <span ${hot('look', 'stg-watch')}>${icon('play', 12)} Watch now</span>
      </div>
    </div>
    <div ${hot('posters', 'stg-posters')}>${tag('posters')}
      ${s.continueRow
        ? `<h4>Continue watching</h4><div class="stg-rail s-${s.cardSize}">${posters.slice(0, per).map((p, i) => `<div class="stg-poster p${i}${p.img ? ' has-img' : ''}">${p.img ? `<img src="${esc(p.img)}" alt="" decoding="async">` : ''}${i === 0 && s.hoverTrailer ? `<span class="stg-prev">${icon('play', 9)} Trailer</span>` : ''}<span>${esc(p.name)}</span></div>`).join('')}</div>`
        : '<div class="stg-hidden">Continue watching is hidden</div>'}
    </div>
    <div ${hot('episodes', 'stg-eps ' + s.epStyle)}>${tag('episodes')}<h4>Episodes</h4>${epHTML}</div>
    <div ${hot('player', 'stg-player')}>${tag('player')}
      <span class="stg-play">${icon('play', 13)}</span><div class="stg-bar"><i></i></div>
      <span class="pill">${aud}</span>${s.resume ? '<span class="pill">Resume Ep 8</span>' : ''}
      <span class="pill ${s.autonext ? 'hot' : 'off'}">${s.autonext ? 'Next episode in 5s' : 'Autonext off'}</span>
    </div>
    <div class="stg-foot">
      <span ${hot('privacy', 'stg-chip')}>${tag('privacy')}${icon('shield', 13)} Privacy${s.incognito ? ': history paused' : ''}</span>
      <span ${hot('data', 'stg-chip')}>${tag('data')}${icon('database', 13)} Data and about</span>
    </div>
  </div>`;
}
function paintStage() { const m = $('#stg-mock'); if (m) m.innerHTML = stageHTML(); }
/* Changing area only moves the highlight (the preview is not rebuilt), so the outline and corner handles can ease between parts */
function markStage() { $$('#stg-mock [data-region]').forEach(e => e.classList.toggle('sel', e.dataset.region === REG)); }
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function inspectorHTML() {
  const q = Q.trim().toLowerCase();
  const close = `<button class="stg-x" id="stg-x" aria-label="Close panel">${icon('close', 16)}</button>`;
  if (q) {
    const hits = SECTIONS.flatMap(sec => sec.items.filter(it => hayOf(it, sec).includes(q)).map(it => ({ it, sec })));
    return `<header>${close}<h2>Results</h2><p>${hits.length} setting${hits.length === 1 ? '' : 's'} matching “${esc(Q.trim())}”</p></header>
      <div class="mrows">${hits.length ? hits.map(({ it, sec }) => mRowHTML(it, sec)).join('') : '<p class="mnone">No settings match that.</p>'}</div>`;
  }
  const r = REGIONS.find(x => x.id === REG);
  if (!r) return `<header>${close}<h2>Pick something to change</h2><p>Tap any part of the preview, or choose one of the buttons above it.</p></header>`;
  const items = regionItems(r);
  return `<header>${close}<h2>${r.name}</h2><p>${r.desc}</p></header><div class="mrows">${items.map(({ it, sec }) => mRowHTML(it, sec)).join('')}</div>`;
}
/* Tab bar: one accent pill slides to the active tab, and the bar scrolls the active tab to the middle when it overflows (phones) */
let tabsRO = null;
function syncTabs(instant) {
  const nav = $('#stg-tabs'); if (!nav) return;
  const ind = $('.stg-ind', nav), on = $('button.on', nav);
  if (!ind) return;
  if (!on) { ind.classList.remove('show'); edgeFade(); return; }
  const place = () => {
    ind.style.setProperty('--x', on.offsetLeft + 'px'); ind.style.setProperty('--y', on.offsetTop + 'px');
    ind.style.setProperty('--w', on.offsetWidth + 'px'); ind.style.setProperty('--h', on.offsetHeight + 'px');
  };
  if (instant || !ind.classList.contains('show') || reduceMotion()) {
    ind.classList.add('still'); place(); void ind.offsetWidth; ind.classList.add('show');
    requestAnimationFrame(() => ind.classList.remove('still'));
  } else place();
  if (nav.scrollWidth > nav.clientWidth + 1) nav.scrollTo({ left: on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2, behavior: instant || reduceMotion() ? 'auto' : 'smooth' });
  edgeFade();
}
/* Soft fade on whichever side of the tab bar still has tabs hidden, so it is obvious the bar scrolls */
function edgeFade() {
  const nav = $('#stg-tabs'); if (!nav) return;
  const max = nav.scrollWidth - nav.clientWidth;
  nav.style.setProperty('--fl', max > 2 && nav.scrollLeft > 4 ? '30px' : '0px');
  nav.style.setProperty('--fr', max > 2 && nav.scrollLeft < max - 4 ? '30px' : '0px');
}
function watchTabs() {
  const nav = $('#stg-tabs'); if (!nav) return;
  if (tabsRO) tabsRO.disconnect();
  if (window.ResizeObserver) { tabsRO = new ResizeObserver(() => syncTabs(true)); tabsRO.observe(nav); $$('button', nav).forEach(b => tabsRO.observe(b)); }
  nav.addEventListener('scroll', edgeFade, { passive: true });
  /* Desktop: the mouse wheel and click-drag scroll the bar sideways (the page still scrolls once the bar reaches an end) */
  nav.addEventListener('wheel', e => {
    const max = nav.scrollWidth - nav.clientWidth;
    if (max < 2 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if ((e.deltaY < 0 && nav.scrollLeft <= 0) || (e.deltaY > 0 && nav.scrollLeft >= max - 1)) return;
    e.preventDefault(); nav.scrollLeft += e.deltaY;
  }, { passive: false });
  let sx = 0, sl = 0, down = false, moved = false;
  nav.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = nav.scrollLeft; });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (!moved && Math.abs(dx) > 5) { moved = true; nav.classList.add('drag'); }
    if (moved) nav.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => { if (!down) return; down = false; nav.classList.remove('drag'); });
  nav.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => syncTabs(true));
}

/* The inspector eases between areas: content slides in from the side the tab is on, rows follow one after another, and the panel resizes instead of jumping */
let inspKey = null;
function swapInspector(el, dir, h0, resize) {
  if (reduceMotion()) return;
  el.style.setProperty('--dir', dir);
  $$('.mrows > *', el).forEach((c, i) => c.style.setProperty('--n', Math.min(i, 9)));
  el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  clearTimeout(el._swapT); el._swapT = setTimeout(() => el.classList.remove('swap'), 760);
  if (!resize) return;
  const h1 = el.offsetHeight;
  if (Math.abs(h1 - h0) < 2) return;
  el.style.overflow = 'hidden'; el.style.height = h0 + 'px'; void el.offsetHeight;
  el.style.transition = 'height .4s cubic-bezier(.22,1,.36,1)'; el.style.height = h1 + 'px';
  clearTimeout(el._heightT);
  el._heightT = setTimeout(() => { el.style.height = el.style.transition = el.style.overflow = ''; }, 440);
}
function paintInspector() {
  const el = $('#stg-insp'); if (!el) return;
  const key = Q.trim() ? '?q' : REG, changed = key !== inspKey;
  const wasOpen = el.classList.contains('open'), h0 = el.offsetHeight;
  const idx = k => REGIONS.findIndex(r => r.id === k), dir = idx(key) < idx(inspKey) ? -1 : 1;
  clearTimeout(el._heightT); el.style.height = el.style.transition = el.style.overflow = '';
  el.innerHTML = inspectorHTML();
  if (changed) el.scrollTop = 0;
  el.classList.toggle('open', !!REG || !!Q.trim());
  document.body.classList.toggle('stg-open', !!REG || !!Q.trim());
  $$('#stg-tabs button').forEach(b => { const on = b.dataset.region === REG && !Q.trim(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  syncTabs();
  wireRows();
  const x = $('#stg-x'); if (x) x.onclick = () => { REG = ''; Q = ''; const qi = $('#set-q'); if (qi) qi.value = ''; markStage(); paintInspector(); };
  if (changed && inspKey !== null) swapInspector(el, dir, h0, wasOpen);
  inspKey = key;
}
/* On a phone the sheet covers the lower part of the screen, so bring the chosen part of the preview up into view */
function revealRegion(id) {
  if (innerWidth > 900) return;
  const t = $('#stg-mock [data-region="' + id + '"]'); if (!t) return;
  const r = t.getBoundingClientRect(), bar = ($('#stg-tabs') || {}).offsetHeight || 0, room = innerHeight * 0.42;
  if (r.bottom > room || r.top < bar + 8) scrollBy({ top: r.top - bar - 24, behavior: reduceMotion() ? 'auto' : 'smooth' });
}
function pickRegion(id) {
  REG = id; Q = ''; const qi = $('#set-q'); if (qi) qi.value = '';
  history.replaceState(null, '', '?s=' + id);
  markStage(); paintInspector(); revealRegion(id);
}
function renderStage() {
  const want = new URLSearchParams(location.search).get('s');
  const fromUrl = REGIONS.some(r => r.id === want) ? want : OLD_SECTION[want] || '';
  if (!REG) REG = fromUrl || (innerWidth > 900 ? 'look' : '');
  $('#page').innerHTML = `<div class="stg">
    <header class="stg-top">
      <div><h1>Settings</h1><p>Click part of the preview to change it. Changes save on this device as you make them.</p></div>
      ${uiSwitchHTML()}
    </header>
    <div class="stg-tools">
      <nav class="stg-tabs" id="stg-tabs" aria-label="Settings areas"><span class="stg-ind" aria-hidden="true"></span>${REGIONS.map(r => `<button data-region="${r.id}" aria-pressed="false">${icon(r.ic, 14)}<span>${r.name}</span></button>`).join('')}</nav>
      <label class="mset-find">${icon('search', 14)}<input id="set-q" placeholder="Search all settings" aria-label="Search settings" value="${esc(Q)}"></label>
    </div>
    <div class="stg-body">
      <div class="stg-stage" aria-label="Live preview of the site"><div id="stg-mock" aria-hidden="true"></div></div>
      <aside class="stg-insp" id="stg-insp" aria-live="polite"></aside>
    </div>
  </div>`;
  wireSwitch();
  inspKey = null;
  paintStage(); paintInspector(); watchTabs();
  $('#stg-mock').addEventListener('click', e => { const h = e.target.closest('[data-region]'); if (h) pickRegion(h.dataset.region); });
  $('#stg-tabs').addEventListener('click', e => { const b = e.target.closest('button[data-region]'); if (b) pickRegion(b.dataset.region); });
  $('#set-q').oninput = e => { Q = e.target.value; if (Q.trim()) REG = ''; paintStage(); paintInspector(); };
  $('#set-q').onkeydown = e => { if (e.key === 'Escape' && Q) { Q = ''; e.target.value = ''; paintInspector(); } };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && REG && !$('.auth-bg') && !$('dialog[open]') && innerWidth <= 900 && isModern()) { REG = ''; paintStage(); paintInspector(); } });
}

/* Live preview (Classic layout): a poster, a tag row and a short episode list that follow title language, audio, poster size, spoilers and episode order */
function paintPrev() {
  const box = $('#mprev'); if (!box) return;
  const s = Settings.get(), audio = (localStorage.getItem('as_lang') || s.audio) === 'dub' ? 'Dub' : 'Sub';
  const h = SHOW && SHOW.hero;
  const title = h ? titleOf(h) : s.titleLang === 'romaji' ? 'Sousou no Frieren' : 'Frieren: Beyond Journey\'s End';
  const eps = [[1, 'The Journey\'s End', true], [2, 'It Didn\'t Have to Be Magic', true], [3, 'Killing Magic', false], [4, 'The Land Where Souls Rest', false]];
  if (s.epOrder === 'desc') eps.reverse();
  const w = s.cardSize === 'small' ? 112 : s.cardSize === 'large' ? 168 : 140;
  box.innerHTML = `
    <h3>Preview</h3>
    <div class="pv-card" style="width:${w}px">
      <div class="pv-poster">${h ? `<img class="pv-img" src="${esc(thumbOf(h))}" alt="" decoding="async">` : ''}<span class="pv-score">★ ${h && scoreOf(h) ? scoreOf(h) : '9.3'}</span><span class="pv-air">Airing</span>
        <div class="pv-tags"><span>Ep 28</span><span>${audio}</span></div>
        <strong>${esc(title)}</strong></div>
    </div>
    <ul class="pv-eps ${s.hideSpoilers ? 'spoil' : ''}">${eps.map(([n, t, seen]) =>
      `<li class="${seen ? 'seen' : ''}"><b>${n}</b><span class="${!seen && s.hideSpoilers ? 'blur' : ''}">${esc(t)}</span>${seen ? icon('check', 13) : ''}</li>`).join('')}</ul>
    <p class="pv-note">${s.incognito ? 'Incognito is on: nothing you watch is saved.' : s.autonext ? 'Autonext is on: the next episode starts by itself.' : 'Autonext is off: you pick each episode.'}</p>`;
}

/* ---------- Wiring shared by both layouts ---------- */
const afterChange = () => { paintPrev(); paintStage(); };

/* ---------- Pop-ups (sync code, password) ---------- */
function openDlg(html) {
  const d = document.createElement('dialog');
  d.className = 'pf-dlg stg-dlg'; d.innerHTML = html;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => {                                       // A click on the dimmed area outside the box closes it
    const r = d.getBoundingClientRect();
    if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
  });
  d.addEventListener('click', e => { if (e.target.closest('[data-d="back"]')) d.close(); });
  d.showModal();
  return d;
}
const dlgFail = (d, id, m) => { const p = d.querySelector('#' + id); p.textContent = m; p.hidden = false; };

function openSyncPaste() {
  const d = openDlg(`<h2>Use a sync code</h2>
    <p class="dlg-sub">Paste a code from another device. It is merged with what you have here, so nothing on this device is lost.</p>
    <div class="pf-dlg-body">
      <label class="set-lbl">Sync code<textarea class="set-in sync-in" id="sc-in" spellcheck="false" autocomplete="off" placeholder="AS1:..."></textarea></label>
      <p class="dlg-err" id="sc-err" role="alert" hidden></p>
    </div>
    <div class="pf-dlg-act"><button type="button" class="btn btn-ghost" data-d="back">Back</button><button type="button" class="btn btn-primary" data-d="ok">Merge</button></div>`);
  const box = d.querySelector('#sc-in'), ok = d.querySelector('[data-d="ok"]');
  const submit = () => {
    d.querySelector('#sc-err').hidden = true;
    const code = box.value.trim();
    if (!code) return dlgFail(d, 'sc-err', 'Paste a sync code first');
    ok.disabled = true;
    unpackData(code).then(o => { mergeData(o); Sync.touch('list'); Sync.touch('fav'); d.close(); toast('Merged. Reloading...'); setTimeout(() => location.reload(), 700); })
      .catch(() => { ok.disabled = false; dlgFail(d, 'sc-err', 'That sync code is not valid'); });
  };
  ok.onclick = submit;
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  box.focus();
}

function openPasswordDialog() {
  const d = openDlg(`<h2>Change password</h2>
    <div class="pf-dlg-body">
      <label class="set-lbl">Current password<input class="set-in" id="pw-cur" type="password" autocomplete="current-password"></label>
      <label class="set-lbl">New password<input class="set-in" id="pw-new" type="password" autocomplete="new-password"></label>
      <label class="set-lbl">Confirm new password<input class="set-in" id="pw-con" type="password" autocomplete="new-password"></label>
      <p class="dlg-err" id="pw-err" role="alert" hidden></p>
    </div>
    <div class="pf-dlg-act"><button type="button" class="btn btn-ghost" data-d="back">Back</button><button type="button" class="btn btn-primary" data-d="ok">Confirm</button></div>`);
  const ok = d.querySelector('[data-d="ok"]'), val = id => d.querySelector('#' + id).value;
  const fail = m => dlgFail(d, 'pw-err', m);
  async function submit() {
    d.querySelector('#pw-err').hidden = true;
    const cur = val('pw-cur'), a = val('pw-new'), b = val('pw-con');
    if (!cur) return fail('Enter your current password');
    if (a.length < 6) return fail('New password must be at least 6 characters');
    if (a !== b) return fail('The new passwords do not match');
    if (a === cur) return fail('Choose a password you have not used for this account');
    ok.disabled = true; ok.textContent = 'Updating...';
    try {
      const sb = await Auth.client();
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !user.email) throw new Error('Please log in again');
      const re = await sb.auth.signInWithPassword({ email: user.email, password: cur });   // Proves it is really you
      if (re.error) throw /invalid login|invalid credentials/i.test(re.error.message || '') ? Object.assign(new Error('wrong'), { wrong: true }) : re.error;
      const { error } = await sb.auth.updateUser({ password: a });
      if (error) throw error;
      d.close(); toast('Password updated');
    } catch (e) {
      fail(e.wrong ? 'Current password is incorrect' : /same|different/i.test(e?.message || '') ? 'Choose a password you have not used for this account' : (Auth._fail(e).message || 'Could not update the password'));
      ok.disabled = false; ok.textContent = 'Confirm';
    }
  }
  ok.onclick = submit;
  d.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); submit(); } });
  d.querySelector('#pw-cur').focus();
}
const ACT2 = {
  login: () => openAuth('login'),
  syncnow() {
    const btn = $('[data-act="syncnow"]'); if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
    Sync._last = 0;
    Sync.run().then(() => { toast(Sync.off === 'missing' ? 'Cloud sync is not set up on the server yet' : 'Synced'); }).finally(() => { const b = $('#sync-status'); if (b) { b.innerHTML = syncStatusHTML(); wireRows(); } });
  },
  clearcache() {
    if (!confirm('Clear cached data? Your list, history and settings are kept.')) return;
    Object.keys(localStorage).filter(k => k.startsWith('as_plan:')).forEach(k => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter(k => k.startsWith('al:')).forEach(k => sessionStorage.removeItem(k));
    (window.caches ? caches.delete('amnestream-img-v1') : Promise.resolve()).catch(() => {}).finally(() => {
      toast('Cache cleared'); const b = $('#storage-box'); if (b) b.innerHTML = storageHTML();
    });
  },
  changepw: openPasswordDialog,
};

function wireRows() {
  $$('.toggle').forEach(b => b.onclick = () => {
    let on = !b.classList.contains('on');
    if (b.dataset.k === 'includeAdult') { on = setAdult(on); }
    else Settings.set(b.dataset.k, on);
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    const lab = $('span', b); if (lab) lab.textContent = on ? 'On' : 'Off';
    afterChange();
  });
  $$('.segc button[data-k]').forEach(b => b.onclick = () => {
    Settings.set(b.dataset.k, b.dataset.v);
    if (b.dataset.k === 'audio') localStorage.setItem('as_lang', b.dataset.v);       // The player reads this first
    if (b.dataset.k === 'epStyle') localStorage.setItem('as_epstyle19', '1');        // So the details page does not move you off "Numbers" once
    const wrap = b.parentNode, btns = $$('button', wrap);
    btns.forEach(x => x.classList.toggle('on', x === b));
    wrap.style.setProperty('--i', btns.indexOf(b));
    afterChange();
  });
  $$('[data-theme-pick]').forEach(b => b.onclick = () => {
    Settings.set('theme', b.dataset.themePick);
    $$('[data-theme-pick]').forEach(x => x.classList.toggle('on', x === b));
    afterChange();
  });
  const setAccent = c => {
    Settings.set('accent', c);
    $$('.acc-dot').forEach(x => x.classList.toggle('on', x.dataset.accent === c));
    $$('.acc-custom').forEach(x => x.classList.toggle('on', !!c && !ACCENTS.includes(c)));
    $$('button[data-accent=""]').forEach(x => { x.disabled = !c; });
    afterChange();
  };
  $$('[data-accent]').forEach(b => b.onclick = () => setAccent(b.dataset.accent));
  const pick = $('#acc-pick'); if (pick) pick.oninput = () => setAccent(pick.value.toLowerCase());
  if ($('#a-save')) $('#a-save').onclick = () => {
    const avatar = $('#a-avatar').value.trim();
    if (avatar && !/^(https?:\/\/|data:image\/)/i.test(avatar)) { toast('Avatar link must start with https://'); return; }
    User.set({ name: $('#a-name').value.trim() || 'Guest',
      username: ($('#a-user').value.trim().replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '')) || 'guest',
      avatar, bio: $('#a-bio').value.trim().slice(0, BIO_MAX) });
    toast('Profile saved'); Q = ''; render(); buildHeader();
  };
  $$('[data-act]').forEach(b => b.onclick = () => ACT2[b.dataset.act] ? ACT2[b.dataset.act]() : act(b.dataset.act));
}


function render() { document.body.classList.toggle('stg-page', isModern()); return isModern() ? renderStage() : renderPanels(); }

const WIPE_ONLY = ['as_epstyle19', 'as_dead_servers', 'as_me', 'as_sync', 'as_sync_at', 'as_nodub'];     // Housekeeping keys: not backed up, but removed by "Delete all local data"
const KEYS = ['as_settings', 'as_user', 'as_list', 'as_progress', 'as_seen', 'as_activity', 'as_lang', 'as_server', 'as_browse_last', 'as_browse_presets', 'as_fav'];
/* Sync code: your data as one pasteable string (gzip + base64) */
async function packData() {
  const out = {}; KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) out[k] = v; });
  let buf = new TextEncoder().encode(JSON.stringify(out)), tag = 'AS0';
  if (window.CompressionStream) {
    buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    tag = 'AS1';
  }
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return tag + ':' + btoa(bin);
}
async function unpackData(code) {
  const [tag, b64] = code.trim().split(':');
  if (!['AS0', 'AS1'].includes(tag) || !b64) throw new Error('bad code');
  let buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (tag === 'AS1') {
    if (!window.DecompressionStream) throw new Error('unsupported');
    buf = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(buf));
}
/* Merge instead of overwrite so nothing on this device is lost */
function mergeData(o) {
  const J = (k, d) => { try { return JSON.parse(o[k]) ?? d; } catch { return d; } };
  const list = jget('as_list', []), ids = new Set(list.map(x => x.id));
  J('as_list', []).forEach(x => { if (!ids.has(x.id)) list.push(x); });
  jset('as_list', list.slice(0, 500));
  jset('as_fav', [...new Set([...jget('as_fav', []), ...J('as_fav', [])])].slice(0, 500));
  const prog = jget('as_progress', {});
  Object.entries(J('as_progress', {})).forEach(([id, p]) => { if (!prog[id] || p.ts > prog[id].ts) prog[id] = p; });
  jset('as_progress', prog);
  const seen = jget('as_seen', {});
  Object.entries(J('as_seen', {})).forEach(([id, a]) => { seen[id] = [...new Set([...(seen[id] || []), ...a])]; });
  jset('as_seen', seen);
  const act = jget('as_activity', {});
  Object.entries(J('as_activity', {})).forEach(([d, n]) => { act[d] = Math.max(act[d] || 0, n); });
  jset('as_activity', act);
  const pre = jget('as_browse_presets', []), names = new Set(pre.map(p => p.name));
  J('as_browse_presets', []).forEach(p => { if (!names.has(p.name)) pre.push(p); });
  jset('as_browse_presets', pre.slice(-20));
  ['as_settings', 'as_user', 'as_lang', 'as_server'].forEach(k => { if (o[k] && localStorage.getItem(k) === null) localStorage.setItem(k, o[k]); });
}

function act(a) {
  if (a === 'synccopy') {
    packData().then(code => (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(
      () => toast('Sync code copied. Paste it on your other device.'),
      () => prompt('Copy this sync code:', code)));
  } else if (a === 'syncpaste') {
    openSyncPaste();
  } else if (a === 'export') {
    const out = {}; KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) out[k] = v; });
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'amnestream-backup.json' }).click();
    URL.revokeObjectURL(url); toast('Backup downloaded');
  } else if (a === 'import') {
    const f = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });
    f.onchange = async () => {
      try {
        const o = JSON.parse(await f.files[0].text());
        if (!o || typeof o !== 'object' || Array.isArray(o) || !Object.keys(o).some(k => KEYS.includes(k))) throw new Error('bad file');
        Object.entries(o).forEach(([k, v]) => KEYS.includes(k) && typeof v === 'string' && localStorage.setItem(k, v));
        Sync.touch('list'); Sync.touch('fav'); Sync.later();
        toast('Backup restored'); setTimeout(() => location.reload(), 600); }
      catch { toast('That file isn\'t a valid backup'); }
    };
    f.click();
  } else if (a === 'clearhist') {
    if (confirm('Clear your watch history?')) { Store.clearHistory(); toast('History cleared'); }
  } else if (a === 'reset') {
    if (confirm('Reset all settings to defaults?')) { Settings.reset(); localStorage.removeItem('as_lang'); toast('Settings reset'); render(); }
  } else if (a === 'wipe') {
    if (confirm('Delete ALL local data? This cannot be undone.')) { Auth.logout(); [...KEYS, ...WIPE_ONLY].forEach(k => localStorage.removeItem(k)); toast('All data deleted'); setTimeout(() => location.href = 'index.html', 600); }
  }
}
document.addEventListener('DOMContentLoaded', () => { render(); loadShowcase(); });
