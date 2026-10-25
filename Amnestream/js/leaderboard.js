document.addEventListener('DOMContentLoaded', () => {
  const u = User.get(), eps = Object.values(Store.seen()).reduce((n, a) => n + a.length, 0);
  $('#page').innerHTML = `
    <div class="page-head"><h1>Leaderboard</h1><p class="muted">Ranked by episodes watched</p></div>
    <div class="lb-row"><div class="lb-rank">#1</div>${avatarHTML(44)}
      <div style="flex:1"><strong>${esc(u.name)}</strong><div class="muted" style="font-size:12px">@${esc(u.username)}</div></div>
      <div class="pf-big" style="font-size:22px">${eps}<small>eps</small></div></div>
    <p class="muted" style="margin-top:16px;font-size:13px;max-width:560px">Amnestream stores everything on your device, so only you appear here for now. A shared leaderboard needs a server to collect everyone's stats.</p>`;
});
