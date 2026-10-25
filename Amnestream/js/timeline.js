/* Timeline: Gantt-style view of airing anime; each bar is a show's run and links to details */
const DAY = 86400000, WEEK = 7 * DAY, DW = 40;           // Px per day
const BACK_DAYS = 8, TOTAL_DAYS = 84;
const TZ = 'Asia/Manila';                                    // Always GMT+8
let DATA = [], clockT;

function parts(ms, tz, opt) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: true, ...opt }).format(ms);   // 12-hour clock
}
function midnight(ms, tz) {                                  // Epoch of 00:00 in the time zone for the day containing ms
  const o = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(ms).forEach(p => o[p.type] = p.value);
  const wall = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute, +o.second);
  return Date.UTC(+o.year, +o.month - 1, +o.day) - (wall - Math.floor(ms / 1000) * 1000);
}
const dur = ms => {
  const h = Math.max(0, Math.floor(ms / 3600000)), d = Math.floor(h / 24);
  return d ? `${d}d ${h % 24}h` : `${h}h ${Math.floor(ms % 3600000 / 60000)}m`;
};
function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)); }
function colorOf(m) {
  const c = m.coverImage?.color;
  if (c && /^#[0-9a-f]{6}$/i.test(c)) return c;
  const hue = (m.id * 47) % 360; return `hsl(${hue} 55% 62%)`;
}
function runOf(m) {
  const n = m.nextAiringEpisode; if (!n) return null;
  const total = m.episodes || null;
  const start = n.airingAt * 1000 - (n.episode - 1) * WEEK;
  const lastEp = total || n.episode + 11;
  const end = n.airingAt * 1000 + Math.max(0, lastEp - n.episode) * WEEK + 30 * 60000;
  return { start, end, total, n };
}

async function initTimeline() {
  enableDragScroll($('#tl-scroll'));                 // No scrollbar, so the mouse drags the timeline

  const ids = Object.values(Store.progress()).sort((a, b) => b.ts - a.ts).slice(0, 50).map(x => x.id);
  if (!ids.length) {
    $('#tl-canvas').innerHTML = `<div class="tl-empty">Nothing here yet. Start watching an airing anime and it will show up on your timeline.<br><br>
      <a class="btn btn-primary" href="browse.html?status=RELEASING">Browse airing anime</a></div>`;
    return;
  }
  try {
    const data = await Api.timelineFor(ids);
    DATA = data.Page.media
      .filter(m => m.nextAiringEpisode && ['TV', 'ONA', 'TV_SHORT'].includes(m.format))
      .sort((a, b) => a.nextAiringEpisode.airingAt - b.nextAiringEpisode.airingAt)
      .map(m => ({ m, run: runOf(m) }));
    if (!DATA.length) {
      $('#tl-canvas').innerHTML = `<div class="tl-empty">None of the anime you're watching are airing right now.<br><br>
        <a class="btn btn-primary" href="browse.html?status=RELEASING">Browse airing anime</a></div>`;
      return;
    }
    draw(true);
  } catch (err) {
    $('#tl-canvas').innerHTML = `<p class="tl-empty">${esc(err.message)}</p>`;
  }
}

function enableDragScroll(el) {
  let down = false, moved = false, sx = 0, sy = 0, sl = 0, st = 0;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; st = el.scrollTop;
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > 5) { moved = true; el.classList.add('dragging'); }
    if (moved) { el.scrollLeft = sl - dx; el.scrollTop = st - dy; }
  });
  window.addEventListener('pointerup', () => { down = false; setTimeout(() => el.classList.remove('dragging'), 0); });
  el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);   // A drag is not a click
}

function draw(scrollToNow) {
  const scroller = $('#tl-scroll'), canvas = $('#tl-canvas');
  const keepLeft = scroller.scrollLeft;
  const now = Date.now();
  const t0 = midnight(now, TZ) - BACK_DAYS * DAY;
  const W = TOTAL_DAYS * DW;
  const X = ms => (ms - t0) / DAY * DW;
  canvas.style.setProperty('--dw', DW + 'px');
  canvas.style.width = W + 'px';

  // Header: months, weekdays, day numbers
  let months = '', days = '', prev = '';
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const t = t0 + i * DAY + 12 * 3600000;
    const mo = parts(t, TZ, { month: 'long' }), wd = parts(t, TZ, { weekday: 'short' }).slice(0, 2);
    const dn = parts(t, TZ, { day: 'numeric' });
    const isToday = t0 + i * DAY <= now && now < t0 + (i + 1) * DAY;
    if (mo !== prev) {
      if (months) months = months.replace(/%W%/, (i * DW - parseFloat(/left:([\d.]+)px/.exec(months.split('<div').pop())[1])) + 'px');
      months += `<div class="tl-month" style="left:${i * DW}px;width:%W%"><span>${mo}</span></div>`;
      prev = mo;
    }
    days += `<div class="tl-day ${isToday ? 'today' : ''} ${['Sa', 'Su'].includes(wd) ? 'wk' : ''}" style="left:${i * DW}px">${wd}<b>${dn}</b></div>`;
  }
  months = months.replace(/%W%/, (W - parseFloat(/left:([\d.]+)px/.exec(months.split('<div').pop())[1])) + 'px');

  // Rows
  const rows = DATA.map(({ m, run }) => {
    const c = colorOf(m), tc = lum(c.startsWith('#') ? c : '#999999') > 150 ? '#14101a' : '#fff';
    const l = Math.max(0, X(run.start)), r = Math.min(W, X(run.end));
    if (r <= 0 || l >= W) return '';
    const w = r - l;
    let ticks = '';
    for (let ep = 1; ep <= (run.total || run.n.episode + 11); ep++) {
      const at = run.start + (ep - 1) * WEEK + (ep >= run.n.episode ? 0 : 0);
      const px = X(at) - l; if (px < 0 || px > w) continue;
      const when = parts(at, TZ, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      ticks += `<i class="tl-tick ${at > now ? 'future' : ''}" style="left:${px}px" title="Episode ${ep} - ${when}"></i>`;
    }
    const left = run.n.airingAt * 1000 - now;
    const endPill = r < W ? `<span class="tl-end" style="left:${r}px">${dur(run.end - now)}</span>` : '';
    return `<div class="tl-row">
      <a class="tl-bar ${X(run.start) < 0 ? 'cut-l' : ''}" href="anime.html?id=${m.id}" title="${esc(titleOf(m))}"
         style="left:${l}px;width:${w}px;--c:${c};--tc:${tc};--img:url('${thumbOf(m)}')">
        <span class="tl-title">${esc(titleOf(m))}</span>
        <span class="tl-next">Ep ${run.n.episode} in ${dur(left)}</span>
        ${ticks}
      </a>${endPill}</div>`;
  }).join('');

  canvas.innerHTML = `
    <div class="tl-head"><div class="tl-months">${months}</div><div class="tl-days">${days}</div>
      <div class="tl-now-label" id="tl-clock" style="left:${X(now)}px"></div></div>
    <div class="tl-now" style="left:${X(now)}px"></div>
    <div class="tl-rows">${rows || '<p class="tl-empty">No airing shows found.</p>'}</div>`;

  const tick = () => { const el = $('#tl-clock'); if (el) el.textContent = parts(Date.now(), TZ, { hour: 'numeric', minute: '2-digit', second: '2-digit' }); };
  tick(); clearInterval(clockT); clockT = setInterval(tick, 1000);

  scroller.scrollLeft = scrollToNow ? Math.max(0, X(now) - 160) : keepLeft;
}

document.addEventListener('DOMContentLoaded', initTimeline);
