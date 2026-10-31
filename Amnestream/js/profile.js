/* Profile: stats computed from what you watched. Modern is a cinema title card with a film strip of your days and end credits; Classic is the watcher pass. Both read the same data. */
const RANKS = ['Newcomer', 'Casual viewer', 'Regular', 'Binge apprentice', 'Marathoner', 'Senpai', 'Sensei', 'Legend'];
let HEAT_WEEKS = 26;
const isModernUI = () => Settings.get().uiMode !== 'classic';

function pfData() {
  const u = User.get(), act = Store.activity(), seen = Store.seen(), prog = Object.values(Store.progress()), list = Store.list();
  const eps = Object.values(seen).reduce((n, a) => n + a.length, 0);
  const titles = Object.keys(seen).length;
  const finished = prog.filter(x => x.total && x.ep >= x.total).length;
  const xp = eps * 10 + list.length * 5, level = 1 + Math.floor(Math.sqrt(xp / 25));
  const lo = (level - 1) ** 2 * 25, hi = level ** 2 * 25, pct = Math.round((xp - lo) / (hi - lo) * 100);
  let streak = 0; const d = new Date();
  if (!act[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (act[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
  const days = Object.keys(act).filter(k => act[k] > 0).sort();       // Longest run of consecutive days
  let best = 0, run = 0, prev = null;
  days.forEach(k => {
    const t = new Date(k + 'T12:00:00').getTime();
    run = prev !== null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  });
  const sumDays = (from, to) => { let n = 0; for (let i = from; i < to; i++) { const t = new Date(); t.setDate(t.getDate() - i); n += act[dayKey(t)] || 0; } return n; };
  return { u, act, seen, prog, list, eps, titles, finished, xp, level, lo, hi, pct, streak, best,
    week: sumDays(0, 7), lastWeek: sumDays(7, 14), hours: Math.round(eps * 24 / 6) / 10, rank: RANKS[Math.min(level - 1, RANKS.length - 1)] };
}
function heatCells(act, weeks) {
  const today = new Date(); today.setHours(12);
  const cells = []; const start = new Date(today); start.setDate(start.getDate() - 7 * (weeks - 1) - today.getDay());
  for (let t = new Date(start); t <= today; t.setDate(t.getDate() + 1)) {
    const c = act[dayKey(t)] || 0;
    cells.push(`<i class="${c >= 4 ? 'l3' : c >= 2 ? 'l2' : c ? 'l1' : ''}" title="${dayKey(t)}: ${c} episode${c === 1 ? '' : 's'}"></i>`);
  }
  return cells.join('');
}
const recentHTML = recent => recent.length ? `<div class="grid">${recent.map(x => `<article class="card"><div class="card-media"><img src="${esc(x.cover)}" alt="">${hitHTML(`anime.html?id=${x.id}`, savedTitle(x))}${playBtnHTML(`watch.html?id=${x.id}&ep=${x.ep}`, `Play Ep ${x.ep}`)}<span class="card-tags"><span class="tag eps">Ep ${x.ep}</span></span></div><a class="card-title" href="anime.html?id=${x.id}">${esc(savedTitle(x))}</a></article>`).join('')}</div>` : '<p class="empty">Nothing watched yet. Start an episode and it shows up here.</p>';
const joinedOf = u => new Date(u.joined).toLocaleDateString('en', { month: 'short', year: 'numeric' });
function pfSwitchHTML() {
  const m = isModernUI();
  return `<div class="uiswitch" role="group" aria-label="Page layout"><span class="uis-l">Layout</span>
    <div class="segc" style="--n:2;--i:${m ? 0 : 1}"><button data-ui-pick="modern" class="${m ? 'on' : ''}">Modern</button><button data-ui-pick="classic" class="${m ? '' : 'on'}">Classic</button></div></div>`;
}
function wirePfSwitch() { $$('[data-ui-pick]').forEach(b => b.onclick = () => { if (Settings.get().uiMode === b.dataset.uiPick) return; Settings.set('uiMode', b.dataset.uiPick); paintProfile(); window.scrollTo({ top: 0 }); }); }

/* ---------- Classic: the watcher pass ---------- */
function badgesOf(p) {
  return [
    ['First episode', 'Watch an episode', p.eps, 1, 'play'], ['Ten down', 'Watch 10 episodes', p.eps, 10, 'play'], ['Half-century', 'Watch 50 episodes', p.eps, 50, 'play'],
    ['Centurion', 'Watch 100 episodes', p.eps, 100, 'play'], ['Marathon', 'Watch 500 episodes', p.eps, 500, 'trophy'],
    ['On a roll', 'Reach a 3-day streak', p.best, 3, 'clock'], ['Week strong', 'Reach a 7-day streak', p.best, 7, 'clock'], ['Unstoppable', 'Reach a 30-day streak', p.best, 30, 'trophy'],
    ['Collector', 'Save 10 titles to your list', p.list.length, 10, 'list'], ['Curator', 'Save 50 titles to your list', p.list.length, 50, 'list'],
    ['Finisher', 'Finish a series', p.finished, 1, 'check'], ['Completionist', 'Finish 10 series', p.finished, 10, 'check'], ['Explorer', 'Start 10 different titles', p.titles, 10, 'compass'],
  ].map(([n, d, v, t, ic]) => ({ n, d, v, t, ic, on: v >= t }));
}
function paintPass() {
  const p = pfData(), { u } = p;
  const bs = badgesOf(p), earned = bs.filter(b => b.on).length;
  const recent = p.prog.slice().sort((a, b) => b.ts - a.ts).slice(0, 12);
  const delta = p.week - p.lastWeek, activeDays = Object.keys(p.act).filter(k => p.act[k] > 0).length;
  const stubs = [[p.streak, p.streak === 1 ? 'day streak' : 'day streak', p.best > p.streak ? `best ${p.best}` : 'your best'], [p.eps, 'episodes watched', `${p.week} this week`], [p.titles, 'titles started', `${p.finished} finished`],
    [p.hours, 'hours watched', 'at about 24 min each'], [p.list.length, 'in your list', `${Store.continueList().length} in progress`]];
  $('#page').innerHTML = `<div class="mpf">
    <div class="pf-switch">${pfSwitchHTML()}</div>
    <div class="pass-wrap"><article class="pass">
      <div class="pass-main">
        <div class="pass-av">${avatarHTML(104)}</div>
        <div class="pass-id">
          <h1>${esc(u.name)}</h1>
          <p class="pass-meta">@${esc(u.username)}${u.account ? '' : ' (guest)'} &nbsp;&middot;&nbsp; Member since ${joinedOf(u)}</p>
          ${u.bio ? `<p class="pass-bio">${esc(u.bio)}</p>` : ''}
          <div class="pass-lv"><strong>Level ${p.level}</strong><span>${p.rank}</span><div class="xp" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.pct}%"></i></div><em>${p.hi - p.xp} XP to level ${p.level + 1}</em></div>
        </div>
        <div class="pass-act">
          <button class="btn btn-primary" id="pf-edit-btn">${icon('edit', 14)} Edit profile</button>
          <button class="btn btn-ghost" id="pf-save-btn">${icon('download', 14)} Save pass as image</button>
        </div>
      </div>
      <div class="pass-stubs">${stubs.map(([n, l, s]) => `<div class="stub"><b>${n}</b><span>${l}</span><em>${s}</em></div>`).join('')}</div>
    </article></div>

    <section class="mp">
      <div class="mp-head"><h2>Activity</h2>
        <div class="segc" style="--n:3;--i:${[12, 26, 52].indexOf(HEAT_WEEKS)}" id="heat-seg">${[12, 26, 52].map(w => `<button data-w="${w}" class="${w === HEAT_WEEKS ? 'on' : ''}">${w} weeks</button>`).join('')}</div></div>
      <div class="heat" id="heat">${heatCells(p.act, HEAT_WEEKS)}</div>
      <dl class="mp-sums">
        <div><dt>This week</dt><dd>${p.week} episode${p.week === 1 ? '' : 's'}<small class="${delta >= 0 ? 'up' : 'down'}">${p.lastWeek || p.week ? (delta >= 0 ? '+' : '') + delta + ' vs last week' : ''}</small></dd></div>
        <div><dt>Active days</dt><dd>${activeDays}</dd></div>
        <div><dt>Longest streak</dt><dd>${p.best} day${p.best === 1 ? '' : 's'}</dd></div>
        <div><dt>Finished series</dt><dd>${p.finished}</dd></div>
      </dl>
    </section>

    <section class="mp">
      <div class="mp-head"><h2>Achievements</h2><span class="muted">${earned} of ${bs.length} earned</span></div>
      <div class="badges">${bs.map(b => `<div class="bdg ${b.on ? 'on' : ''}" title="${esc(b.d)}"><span class="bdg-ic">${icon(b.ic, 18)}</span><div><strong>${b.n}</strong><span>${b.on ? 'Earned' : Math.min(b.v, b.t) + ' of ' + b.t}</span></div></div>`).join('')}</div>
    </section>

    ${p.list.length ? `<section class="mp"><div class="mp-head"><h2>Your list</h2><a class="rail-link" href="mylist.html">Open My list</a></div>
      <div class="mp-strip">${p.list.slice(0, 14).map(x => `<a class="mp-poster" href="anime.html?id=${x.id}" title="${esc(savedTitle(x))}"><img loading="lazy" src="${esc(x.cover)}" alt=""><span>${esc(savedTitle(x))}</span></a>`).join('')}</div></section>` : ''}

    <section class="mp"><div class="mp-head"><h2>Recently watched</h2></div>${recentHTML(recent)}</section>

    <dialog class="pf-dlg" id="pf-dlg"><form method="dialog" id="pf-form">
      <h2>Edit profile</h2>
      <div class="pf-dlg-body">
        <label class="set-lbl">Display name<input class="set-in" id="pf-name" value="${esc(u.name)}" maxlength="30"></label>
        <label class="set-lbl">Username<input class="set-in" id="pf-user" value="${esc(u.username)}" maxlength="20"></label>
        <label class="set-lbl">Avatar image URL (optional)<input class="set-in" id="pf-avatar" value="${esc(u.avatar)}" placeholder="https://..."></label>
        <label class="set-lbl">Bio<textarea class="set-in" id="pf-bio" maxlength="160">${esc(u.bio)}</textarea></label>
      </div>
      <div class="pf-dlg-act"><button class="btn btn-ghost" value="cancel" id="pf-cancel">Cancel</button><button class="btn btn-primary" id="pf-save" value="save">Save changes</button></div>
    </form></dialog>
  </div>`;
  wirePfSwitch();
  $$('#heat-seg button').forEach(b => b.onclick = () => { HEAT_WEEKS = +b.dataset.w; paintPass(); });
  wireEdit(p, stubs);
}


/* ---------- Modern: the cinema title card ---------- */
const dayLabel = k => new Date(k + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
function filmFrames(act, weeks) {
  const today = new Date(); today.setHours(12);
  const start = new Date(today); start.setDate(start.getDate() - 7 * (weeks - 1) - today.getDay());
  const out = [];
  for (let t = new Date(start); t <= today; t.setDate(t.getDate() + 1)) {
    const k = dayKey(t), c = act[k] || 0;
    const first = t.getDate() === 1 ? ` data-m="${t.toLocaleDateString('en', { month: 'short' })}"` : '';
    out.push(`<i class="f${c >= 4 ? 3 : c >= 2 ? 2 : c ? 1 : 0}${k === dayKey(today) ? ' now' : ''}" data-k="${k}" data-c="${c}"${first} title="${dayLabel(k)}: ${c} episode${c === 1 ? '' : 's'}"></i>`);
  }
  return out.join('');
}
function paintCinema() {
  const p = pfData(), { u } = p;
  const bs = badgesOf(p), earned = bs.filter(b => b.on).length;
  const recent = p.prog.slice().sort((a, b) => b.ts - a.ts).slice(0, 12);
  const delta = p.week - p.lastWeek, activeDays = Object.keys(p.act).filter(k => p.act[k] > 0).length;
  const credits = [['Episodes watched', p.eps], ['Hours of runtime', p.hours], ['Titles started', p.titles], ['Series finished', p.finished],
    ['Current streak', p.streak + (p.streak === 1 ? ' day' : ' days')], ['Longest streak', p.best + (p.best === 1 ? ' day' : ' days')],
    ['This week', p.week + (p.week === 1 ? ' episode' : ' episodes') + (p.lastWeek || p.week ? ` (${delta >= 0 ? '+' : ''}${delta})` : '')], ['Days with an episode', activeDays], ['On your list', p.list.length]];
  const stubs = [[p.streak, 'day streak'], [p.eps, 'episodes watched'], [p.hours, 'hours watched'], [p.list.length, 'in your list']];
  $('#page').innerHTML = `<div class="cin">
    <div class="pf-switch">${pfSwitchHTML()}</div>
    <section class="cin-hero">
      <div class="cin-beam" aria-hidden="true"></div>
      <div class="cin-reel">${avatarHTML(132)}</div>
      <div class="cin-title">
        <h1>${esc(u.name)}</h1>
        <p class="cin-line"><span class="cin-rate">Lv ${p.level}</span>${p.rank} &nbsp;&middot;&nbsp; @${esc(u.username)}${u.account ? '' : ' (guest)'} &nbsp;&middot;&nbsp; Member since ${joinedOf(u)}</p>
        ${u.bio ? `<p class="cin-bio">“${esc(u.bio)}”</p>` : ''}
        <div class="cin-act"><button class="btn btn-primary" id="pf-edit-btn">${icon('edit', 14)} Edit profile</button><button class="btn btn-ghost" id="pf-save-btn">${icon('download', 14)} Save as image</button></div>
      </div>
    </section>

    <section class="cin-sec">
      <div class="mp-head"><h2>Your days</h2>
        <div class="segc" style="--n:3;--i:${[12, 26, 52].indexOf(HEAT_WEEKS)}" id="heat-seg">${[12, 26, 52].map(w => `<button data-w="${w}" class="${w === HEAT_WEEKS ? 'on' : ''}">${w} weeks</button>`).join('')}</div></div>
      <div class="cin-film"><div class="cin-strip" id="cin-strip">${filmFrames(p.act, HEAT_WEEKS)}</div></div>
      <p class="cin-cap" id="cin-cap" aria-live="polite">One frame per day. Brighter means more episodes, and the lit-up frame at the end is today. Tap a frame to read it.</p>
    </section>

    <section class="cin-sec">
      <div class="mp-head"><h2>Credits</h2></div>
      <dl class="cin-credits">${credits.map(([r, v]) => `<div><dt>${r}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </section>

    <section class="cin-sec">
      <div class="mp-head"><h2>Awards</h2><span class="muted">${earned} of ${bs.length} earned</span></div>
      <div class="cin-awards">${bs.map(b => `<div class="aw ${b.on ? 'on' : ''}" title="${esc(b.d)}" style="--p:${Math.round(Math.min(1, b.v / b.t) * 100)}"><span class="aw-ring"><span class="aw-in">${icon(b.ic, 20)}</span></span><strong>${b.n}</strong><em>${b.on ? 'Earned' : Math.min(b.v, b.t) + ' of ' + b.t}</em></div>`).join('')}</div>
    </section>

    ${p.list.length ? `<section class="cin-sec"><div class="mp-head"><h2>Your list</h2><a class="rail-link" href="mylist.html">Open My list</a></div>
      <div class="mp-strip">${p.list.slice(0, 14).map(x => `<a class="mp-poster" href="anime.html?id=${x.id}" title="${esc(savedTitle(x))}"><img loading="lazy" src="${esc(x.cover)}" alt=""><span>${esc(savedTitle(x))}</span></a>`).join('')}</div></section>` : ''}

    <section class="cin-sec"><div class="mp-head"><h2>Now showing</h2></div>${recentHTML(recent)}</section>
    ${editDialogHTML(u)}
  </div>`;
  wirePfSwitch();
  wireEdit(p, stubs);
  $$('#heat-seg button').forEach(b => b.onclick = () => { HEAT_WEEKS = +b.dataset.w; paintCinema(); });
  const strip = $('#cin-strip');
  strip.scrollLeft = strip.scrollWidth;                                          // Start at today, the right-hand end
  strip.addEventListener('click', e => {
    const f = e.target.closest('i[data-k]'); if (!f) return;
    $$('i.pick', strip).forEach(x => x.classList.remove('pick')); f.classList.add('pick');
    const c = +f.dataset.c;
    $('#cin-cap').textContent = `${dayLabel(f.dataset.k)}: ${c ? c + ' episode' + (c === 1 ? '' : 's') + ' watched' : 'nothing watched'}`;
  });
}
function editDialogHTML(u) {
  return `<dialog class="pf-dlg" id="pf-dlg"><form method="dialog" id="pf-form">
      <h2>Edit profile</h2>
      <div class="pf-dlg-body">
        <label class="set-lbl">Display name<input class="set-in" id="pf-name" value="${esc(u.name)}" maxlength="30"></label>
        <label class="set-lbl">Username<input class="set-in" id="pf-user" value="${esc(u.username)}" maxlength="20"></label>
        <label class="set-lbl">Avatar image URL (optional)<input class="set-in" id="pf-avatar" value="${esc(u.avatar)}" placeholder="https://..."></label>
        <label class="set-lbl">Bio<textarea class="set-in" id="pf-bio" maxlength="160">${esc(u.bio)}</textarea></label>
      </div>
      <div class="pf-dlg-act"><button class="btn btn-ghost" value="cancel" id="pf-cancel">Cancel</button><button class="btn btn-primary" id="pf-save" value="save">Save changes</button></div>
    </form></dialog>`;
}
function wireEdit(p, stubs) {
  const dlg = $('#pf-dlg');
  $('#pf-edit-btn').onclick = () => {
    if (!Auth.session()) { openAuth('login'); return; }                       // Guests have no profile to edit
    if (dlg.showModal) dlg.showModal(); else location.href = 'settings.html?s=account';
  };
  $('#pf-cancel').onclick = e => { e.preventDefault(); dlg.close(); };
  $('#pf-save').onclick = e => {
    e.preventDefault();
    const avatar = $('#pf-avatar').value.trim();
    if (avatar && !/^(https?:\/\/|data:image\/)/i.test(avatar)) { toast('Avatar link must start with https://'); return; }
    User.set({ name: $('#pf-name').value.trim() || 'Guest',
      username: ($('#pf-user').value.trim().replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '')) || 'guest',
      avatar, bio: $('#pf-bio').value.trim() });
    dlg.close(); toast('Profile saved'); setTimeout(() => { paintProfile(); buildHeader(); }, 50);
  };
  $('#pf-save-btn').onclick = () => savePass(p, stubs);
}

/* Draws the pass on a canvas and downloads it as a PNG */
function savePass(p, stubs) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
  const g = c.getContext('2d'), cs = getComputedStyle(document.documentElement), col = n => cs.getPropertyValue(n).trim() || '#888';
  const disp = '"Bricolage Grotesque","Sora",sans-serif', body = '"Manrope",sans-serif';
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  g.fillStyle = col('--bg'); g.fillRect(0, 0, 1200, 630);
  rr(60, 60, 1080, 510, 36); g.fillStyle = col('--card'); g.fill();
  g.save(); rr(60, 60, 1080, 510, 36); g.clip(); g.fillStyle = col('--accent'); g.fillRect(60, 60, 14, 510); g.restore();
  const py = 570 - 150;                                                         // Perforation line
  g.fillStyle = col('--bg'); [60, 1140].forEach(x => { g.beginPath(); g.arc(x, py, 22, 0, 7); g.fill(); });
  g.strokeStyle = col('--muted'); g.globalAlpha = .5; g.setLineDash([10, 9]); g.lineWidth = 2; g.beginPath(); g.moveTo(100, py); g.lineTo(1100, py); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  rr(110, 110, 150, 150, 36); g.fillStyle = col('--accent'); g.fill();
  g.fillStyle = col('--accent-ink'); g.font = `800 78px ${disp}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((p.u.name || 'G')[0].toUpperCase(), 185, 188);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = col('--text'); g.font = `800 64px ${disp}`; g.fillText(p.u.name.slice(0, 22), 296, 175);
  g.fillStyle = col('--muted'); g.font = `500 26px ${body}`; g.fillText(`@${p.u.username}  ·  Member since ${joinedOf(p.u)}`, 298, 220);
  g.fillStyle = col('--text'); g.font = `700 28px ${body}`; g.fillText(`Level ${p.level}  ·  ${p.rank}`, 298, 272);
  rr(298, 292, 640, 12, 6); g.fillStyle = col('--card2'); g.fill(); rr(298, 292, Math.max(12, 640 * p.pct / 100), 12, 6); g.fillStyle = col('--accent'); g.fill();
  g.fillStyle = col('--text'); g.font = `500 22px ${body}`;
  stubs.slice(0, 4).forEach(([n, l], i) => {
    const x = 110 + i * 250;
    g.fillStyle = col('--text'); g.font = `800 56px ${disp}`; g.fillText(String(n), x, py + 80);
    g.fillStyle = col('--muted'); g.font = `500 22px ${body}`; g.fillText(l, x, py + 118);
  });
  g.fillStyle = col('--muted'); g.font = `600 20px ${body}`; g.textAlign = 'right'; g.fillText('amnestream', 1100, 108);
  c.toBlob(blob => {
    if (!blob) { toast('Could not make the image'); return; }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `amnestream-${p.u.username}.png` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Pass saved');
  });
}

function paintProfile() { return isModernUI() ? paintCinema() : paintPass(); }
document.addEventListener('DOMContentLoaded', () => {
  paintProfile();
  Store.fillTitles().then(changed => { if (changed) paintProfile(); });
  document.addEventListener('as:synced', () => { if (!$('#pf-dlg')?.open) paintProfile(); });      // Another device changed your data
});
