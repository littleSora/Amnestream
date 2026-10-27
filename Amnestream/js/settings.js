/* Settings: everything saves to this device as you change it */
const G = { rose:'linear-gradient(120deg,#e11d48,#ff4d79)', amber:'linear-gradient(120deg,#d97706,#fb923c)', blue:'linear-gradient(120deg,#2563eb,#38bdf8)',
  purple:'linear-gradient(120deg,#7c3aed,#c084fc)', green:'linear-gradient(120deg,#059669,#34d399)', gray:'linear-gradient(120deg,#52525b,#a1a1aa)', slate:'linear-gradient(120deg,#334155,#64748b)' };
const GC = { rose:'#fb7185', amber:'#fb923c', blue:'#60a5fa', purple:'#c084fc', green:'#34d399', gray:'#d4d4d8', slate:'#94a3b8' };

const THEMES = [['sakura','Atlas','#181c25','#9db4ff'],['midnight','Midnight','#0e1420','#60a5fa'],['crimson','Crimson','#1a0d0f','#f43f5e'],
  ['emerald','Emerald','#0c1713','#34d399'],['amoled','AMOLED','#000','#ffffff'],['sunset','Sunset','#1a100a','#fb923c'],
  ['amber','Amber','#191309','#fbbf24'],['galaxy','Galaxy','#130d1d','#a78bfa'],['ocean','Ocean','#0a161b','#22d3ee']];

const ALL_SECTIONS = [
  { id: 'playback', name: 'Playback', sub: 'What happens when you press play', ic: 'play', g: 'rose', items: [
    { t: 'toggle', k: 'autonext', ic: 'skip', n: 'Autonext', d: 'Play the next episode when this one ends' },
    { t: 'toggle', k: 'resume', ic: 'clock', n: 'Resume where you left off', d: 'Watch button on details pages continues from your last episode' },
    { t: 'seg', k: 'audio', ic: 'mic', n: 'Default audio', d: 'Japanese with subtitles, or the English dub when there is one', full: 1, opts: [['sub', 'Sub'], ['dub', 'Dub']] },
  ] },
  { id: 'appearance', name: 'Appearance', sub: 'Colours, titles and episode lists', ic: 'palette', g: 'purple', items: [
    { t: 'themes', ic: 'palette', n: 'Theme', d: 'Colour scheme for the whole site, saved on this device', kw: 'color colour scheme dark light', full: 1 },
    { t: 'seg', k: 'titleLang', ic: 'lang', n: 'Title language', d: 'How anime names show across the site', full: 1, opts: [['english', 'English'], ['romaji', 'Romaji']] },
    { t: 'seg', k: 'epOrder', ic: 'sort', n: 'Episode order', d: 'Which end of the episode list comes first', full: 1, opts: [['asc', 'First to latest'], ['desc', 'Latest first']] },
    { t: 'seg', k: 'epStyle', ic: 'grid', n: 'Episode list style', d: 'On details pages', full: 1, opts: [['list', 'Cards'], ['compact', 'Compact'], ['grid', 'Numbers']] },
    { t: 'toggle', k: 'continueRow', ic: 'clock', n: 'Continue watching row', d: 'Show your recent episodes at the top of the homepage' },
    { t: 'toggle', k: 'hoverTrailer', ic: 'film', n: 'Trailer preview on hover', d: 'Hover a poster for a floating card that autoplays the trailer (desktop only)' },
    { t: 'toggle', k: 'reduceMotion', ic: 'ghost', n: 'Reduce motion', d: 'Turn off animations and transitions across the site' },
  ] },
  { id: 'privacy', name: 'Content and privacy', sub: 'What you see and what gets saved', ic: 'shield', g: 'green', items: [
    { t: 'toggle', k: 'includeAdult', ic: 'shield', n: 'Show 18+ titles', d: 'Include adult-rated anime in Browse, search, the home page and the schedule', kw: 'adult 18 nsfw hentai explicit mature all titles' },
    { t: 'toggle', k: 'incognito', ic: 'eye', n: 'Incognito mode', d: 'Pause watch history and activity tracking' },
    { t: 'toggle', k: 'hideSpoilers', ic: 'eye', n: 'Hide spoilers', d: 'Blur thumbnails and titles of episodes you haven\'t watched yet' },
  ] },
  { id: 'account', name: 'Account', sub: 'Your public profile', ic: 'user', g: 'gray', items: [{ t: 'account', n: 'Profile', d: 'Display name, username, avatar and bio', kw: 'account profile name username bio avatar picture', full: 1 }] },
  { id: 'data', name: 'Data and about', sub: 'Backups, your list and the fine print', ic: 'database', g: 'slate', items: [
    { t: 'btn', ic: 'database', n: 'Backup', d: 'Save your settings, list and history to a file', label: 'Export', act: 'export', full: 1 },
    { t: 'btn', ic: 'database', n: 'Restore backup', d: 'Load a file exported from here', label: 'Import', act: 'import', full: 1 },
    { t: 'btn', ic: 'link', n: 'Sync code', d: 'Copy a code to move your list and history to another device', label: 'Copy code', act: 'synccopy', full: 1 },
    { t: 'btn', ic: 'link', n: 'Use a sync code', d: 'Paste a code from another device. It is merged with what you have here', label: 'Paste code', act: 'syncpaste', full: 1 },
    { t: 'btn', ic: 'clock', n: 'Clear watch history', d: 'Empties Continue watching and resume points. Your list stays', label: 'Clear', act: 'clearhist', full: 1 },
    { t: 'btn', ic: 'trash', n: 'Reset settings', d: 'Everything on this page back to defaults', label: 'Reset', act: 'reset', full: 1 },
    { t: 'info', n: 'About', d: 'Settings are stored on this device', kw: 'about local storage browser', full: 1 },
    { t: 'link', ic: 'info', n: 'DMCA and copyright', d: 'How copyright owners can send a takedown notice', label: 'Read', href: 'dmca.html', kw: 'dmca copyright takedown legal disclaimer', full: 1 },
    { t: 'btn', ic: 'trash', n: 'Delete all local data', d: 'Removes profile, list, history and settings from this browser', label: 'Delete', act: 'wipe', full: 1, danger: 1 },
  ] },
];
/* Account section is for signed-in users only */
const SECTIONS = ALL_SECTIONS.filter(s => s.id !== 'account' || !!Auth.session());
let CUR = new URLSearchParams(location.search).get('s') || 'playback';
let Q = '';   // Text in "Search settings"

const hayOf = (it, sec) => ((it.n || '') + ' ' + (it.d || '') + ' ' + (it.kw || '') + ' ' + sec.name).toLowerCase();
/* What a segmented control currently shows (default audio can also change from the player, saved as as_lang) */
const segValue = (it, s) => it.k === 'audio' ? (localStorage.getItem('as_lang') || s.audio) : s[it.k];

function rowHTML(it, sec) {
  const s = Settings.get(), st = `style="--g-c:${GC[sec.g]}"`;
  const head = it.ic ? `<div class="sq" ${st}>${icon(it.ic, 16)}</div>` : '';
  const txt = `<div class="set-txt"><strong>${it.n}</strong><span class="d">${it.d || ''}</span></div>`;
  const cls = `set-row ${it.full ? 'full' : ''} ${it.danger ? 'danger' : ''}`;
  switch (it.t) {
    case 'toggle': return `<div class="${cls}">${head}${txt}<button class="toggle ${s[it.k] ? 'on' : ''}" data-k="${it.k}" role="switch" aria-checked="${!!s[it.k]}" aria-label="${it.n}"></button></div>`;
    case 'seg': { const cur = segValue(it, s); return `<div class="${cls}">${head}${txt}<div class="segc">${it.opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-k="${it.k}" data-v="${v}">${l}</button>`).join('')}</div></div>`; }
    case 'themes': return `<div class="${cls}" style="flex-wrap:wrap">${head}${txt}<div class="themes">${THEMES.map(([id, n, b, a]) =>
      `<button class="theme-opt ${s.theme === id ? 'on' : ''}" data-theme-pick="${id}" style="--tb:${b};--ta:${a}"><i></i>${n}</button>`).join('')}</div></div>`;
    case 'btn': return `<div class="${cls}">${head}${txt}<button class="btn-sm ${it.danger ? 'btn-danger' : ''}" data-act="${it.act}">${it.label}</button></div>`;
    case 'link': return `<div class="${cls}">${head}${txt}<a class="btn-sm" href="${it.href}">${it.label}</a></div>`;
    case 'info': return `<div class="${cls}"><div class="sq" ${st}>${icon('info', 16)}</div><div class="set-txt"><strong>About ${SITE_NAME}</strong><span class="d">Settings, list and history are stored <b>on this device</b> (browser storage); your account (login and profile) is stored online so it works on every device. ${SITE_NAME} doesn't host any video files; it links to third-party sources.</span></div></div>`;
    case 'account': { const u = User.get(); return `<div class="${cls} acct">
      <div class="acct-av">${avatarHTML(78)}</div>
      <div class="set-col">
        <div class="acct-two">
          <label class="set-lbl">Display name<input class="set-in" id="a-name" value="${esc(u.name)}" maxlength="30"></label>
          <label class="set-lbl">Username<input class="set-in" id="a-user" value="${esc(u.username)}" maxlength="20"></label>
        </div>
        <label class="set-lbl">Avatar image URL (optional)<input class="set-in" id="a-avatar" value="${esc(u.avatar)}" placeholder="https://..."></label>
        <label class="set-lbl">Bio<textarea class="set-in" id="a-bio" maxlength="160">${esc(u.bio)}</textarea></label>
        <div><button class="btn btn-primary" id="a-save">Save changes</button></div>
      </div></div>`; }
  }
  return '';
}

/* Page: sidebar once, then only banner and rows redraw so search keeps focus */
function render() {
  const u = User.get();
  $('#page').innerHTML = `<div class="set-layout">
    <aside class="set-side">
      <div class="set-prof"><div class="me">${avatarHTML(38)}<div><strong>${esc(u.name)}</strong><span>@${esc(u.username)}</span></div></div></div>
      <div class="set-search">${icon('search', 14)}<input id="set-q" placeholder="Search settings" aria-label="Search settings" value="${esc(Q)}"></div>
      <div class="set-nav">${SECTIONS.map(s => `<button data-sec="${s.id}"><span class="sq" style="--g:${G[s.g]}">${icon(s.ic, 15)}</span>${s.name}</button>`).join('')}</div>
      <p class="set-note">Changes save as you make them.</p>
    </aside>
    <section>
      <div class="set-banner" id="banner"></div>
      <div class="set-rows" id="rows"></div>
    </section>
  </div>`;
  $$('[data-sec]').forEach(b => b.onclick = () => {
    CUR = b.dataset.sec; Q = ''; $('#set-q').value = '';
    history.replaceState(null, '', '?s=' + CUR); renderMain();
  });
  $('#set-q').oninput = e => { Q = e.target.value; renderMain(); };
  $('#set-q').onkeydown = e => { if (e.key === 'Escape' && Q) { Q = ''; e.target.value = ''; renderMain(); } };
  renderMain();
}

function renderMain() {
  const q = Q.trim().toLowerCase(), sec = SECTIONS.find(s => s.id === CUR) || SECTIONS[0];
  const banner = $('#banner'), rows = $('#rows');
  $$('[data-sec]').forEach(b => b.classList.toggle('on', !q && b.dataset.sec === sec.id));
  if (q) {                                                  // Search looks through every section, not just the open one
    const hits = SECTIONS.flatMap(sc => sc.items.filter(it => hayOf(it, sc).includes(q)).map(it => [it, sc]));
    banner.style.setProperty('--g', G.blue);
    banner.innerHTML = `<div class="sq">${icon('search', 20)}</div><h1>Search results</h1><p>${hits.length} setting${hits.length === 1 ? '' : 's'} matching "${esc(Q.trim())}"</p>`;
    rows.innerHTML = hits.length ? hits.map(([it, sc]) => rowHTML(it, sc)).join('') : '<p class="empty" style="grid-column:1/-1">No settings match that.</p>';
  } else {
    banner.style.setProperty('--g', G[sec.g]);
    banner.innerHTML = `<div class="sq">${icon(sec.ic, 20)}</div><h1>${sec.name}</h1><p>${sec.sub}</p>`;
    rows.innerHTML = sec.items.map(i => rowHTML(i, sec)).join('');
  }
  wireRows();
}

function wireRows() {
  $$('.toggle').forEach(b => b.onclick = () => { let on = !b.classList.contains('on'); if (b.dataset.k === 'includeAdult') { on = setAdult(on); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); return; } b.classList.toggle('on', on); b.setAttribute('aria-checked', on); Settings.set(b.dataset.k, on); });
  $$('.segc button').forEach(b => b.onclick = () => {
    Settings.set(b.dataset.k, b.dataset.v);
    if (b.dataset.k === 'audio') localStorage.setItem('as_lang', b.dataset.v);       // The player reads this first
    if (b.dataset.k === 'epStyle') localStorage.setItem('as_epstyle19', '1');        // So the details page does not move you off "Numbers" once
    $$('.segc button', b.parentNode).forEach(x => x.classList.toggle('on', x === b));
  });
  $$('[data-theme-pick]').forEach(b => b.onclick = () => {
    Settings.set('theme', b.dataset.themePick);
    $$('[data-theme-pick]').forEach(x => x.classList.toggle('on', x === b));
  });
  if ($('#a-save')) $('#a-save').onclick = () => {
    const avatar = $('#a-avatar').value.trim();
    if (avatar && !/^(https?:\/\/|data:image\/)/i.test(avatar)) { toast('Avatar link must start with https://'); return; }
    User.set({ name: $('#a-name').value.trim() || 'Guest',
      username: ($('#a-user').value.trim().replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '')) || 'guest',
      avatar, bio: $('#a-bio').value.trim() });
    toast('Profile saved'); Q = ''; render(); buildHeader();
  };
  $$('[data-act]').forEach(b => b.onclick = () => act(b.dataset.act));
}

const WIPE_ONLY = ['as_epstyle19', 'as_dead_servers', 'as_me'];     // Housekeeping keys: not backed up, but removed by "Delete all local data"
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
    const code = prompt('Paste your sync code');
    if (!code) return;
    unpackData(code).then(o => { mergeData(o); toast('Merged. Reloading...'); setTimeout(() => location.reload(), 700); })
      .catch(() => toast('That sync code is not valid'));
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
        toast('Backup restored'); setTimeout(() => location.reload(), 600); }
      catch { toast('That file isn\'t a valid backup'); }
    };
    f.click();
  } else if (a === 'clearhist') {
    if (confirm('Clear your watch history?')) { ['as_progress', 'as_seen', 'as_activity'].forEach(k => localStorage.removeItem(k)); toast('History cleared'); }
  } else if (a === 'reset') {
    if (confirm('Reset all settings to defaults?')) { Settings.reset(); localStorage.removeItem('as_lang'); toast('Settings reset'); render(); }
  } else if (a === 'wipe') {
    if (confirm('Delete ALL local data? This cannot be undone.')) { Auth.logout(); [...KEYS, ...WIPE_ONLY].forEach(k => localStorage.removeItem(k)); toast('All data deleted'); setTimeout(() => location.href = 'index.html', 600); }
  }
}
document.addEventListener('DOMContentLoaded', render);
