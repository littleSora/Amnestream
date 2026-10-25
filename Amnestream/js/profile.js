/* Profile: stats computed from what you watched on this device */
function paintProfile() {
  const u = User.get(), act = Store.activity(), seen = Store.seen();
  const eps = Object.values(seen).reduce((n, a) => n + a.length, 0);
  const titles = Object.keys(seen).length;
  const xp = eps * 10 + Store.list().length * 5, level = 1 + Math.floor(Math.sqrt(xp / 25));
  const lo = (level - 1) ** 2 * 25, hi = level ** 2 * 25, pct = Math.round((xp - lo) / (hi - lo) * 100);

  let streak = 0; const d = new Date();
  if (!act[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (act[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }

  const today = new Date(); today.setHours(12);
  const cells = []; const start = new Date(today); start.setDate(start.getDate() - 7 * 26 - today.getDay());
  for (let t = new Date(start); t <= today; t.setDate(t.getDate() + 1)) {
    const c = act[dayKey(t)] || 0;
    cells.push(`<i class="${c >= 4 ? 'l3' : c >= 2 ? 'l2' : c ? 'l1' : ''}" title="${dayKey(t)}: ${c} episode${c === 1 ? '' : 's'}"></i>`);
  }
  const recent = Object.values(Store.progress()).sort((a, b) => b.ts - a.ts).slice(0, 12);

  $('#page').innerHTML = `
    <div class="pf-banner"><div class="pf-me">${avatarHTML(72)}<div><h1>${esc(u.name)}</h1><p>@${esc(u.username)} &middot; Joined ${new Date(u.joined).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</p><p>${esc(u.bio)}</p></div></div>
      <a class="btn btn-ghost" style="position:absolute;right:16px;top:16px;z-index:2;background:rgba(0,0,0,.35)" href="settings.html?s=account">${icon('gear', 14)} Edit profile</a></div>
    <div class="pf-grid">
      <div class="pf-card"><h3>Watch streak</h3><div class="pf-big">${streak}<small>day${streak === 1 ? '' : 's'}</small></div><p class="muted" style="margin:6px 0 0;font-size:12px">${streak ? 'Keep it going!' : 'Watch an episode to start a streak.'}</p></div>
      <div class="pf-card"><h3>Level ${level}</h3><div class="pf-big">${xp}<small>XP</small></div><div class="xp"><i style="width:${pct}%"></i></div><p class="muted" style="margin:0;font-size:12px">${hi - xp} XP to level ${level + 1}</p></div>
      <div class="pf-card"><h3>Library</h3><div class="pf-big">${eps}<small>episodes</small></div><p class="muted" style="margin:6px 0 0;font-size:12px">${titles} titles started &middot; ${Store.list().length} in your list</p></div>
    </div>
    <div class="pf-card"><h3>Activity history</h3><div class="heat">${cells.join('')}</div></div>
    <section class="d-sec"><div class="d-sec-head"><span class="d-pill-title">${icon('clock', 14)} Recently watched</span></div>
      ${recent.length ? `<div class="grid">${recent.map(x => `<article class="card"><div class="card-media"><img src="${x.cover}" alt="">${hitHTML(`anime.html?id=${x.id}`, savedTitle(x))}${playBtnHTML(`watch.html?id=${x.id}&ep=${x.ep}`, `Play Ep ${x.ep}`)}<span class="card-tags"><span class="tag eps">Ep ${x.ep}</span></span></div><a class="card-title" href="anime.html?id=${x.id}">${esc(savedTitle(x))}</a></article>`).join('')}</div>` : '<p class="empty">Nothing watched yet.</p>'}
    </section>`;
}
document.addEventListener('DOMContentLoaded', () => {
  paintProfile();
  Store.fillTitles().then(changed => { if (changed) paintProfile(); });
});
