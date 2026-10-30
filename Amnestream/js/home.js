/* Home page */
let RAILS = {};

async function initHome() {
  const hero = $('#hero');
  hero.innerHTML = '<div class="sk" style="height:100%"></div>';
  $('#discover-grid').innerHTML = skeletonGrid(12);
  renderRail('#rail-trending', 'Trending this week', [], { skeleton: true });
  renderRail('#rail-latest', 'Latest episodes', [], { skeleton: true });

  const { season, year } = currentSeason();

  // Fire every request at once; each section paints when its data arrives
  const homeReq = Api.homeRails(season, year);
  const latestReq = Api.latestEpisodes();
  const quickReq = Api.trendingQuick();                        // One slim query so Trending is not stuck behind the big home query
  const weeklyReq = Api.weeklyTrending().catch(() => null);   // null keeps the live trending list

  $('#genre-cloud').innerHTML = visibleGenres().map(g =>
    `<a href="browse.html?genre=${encodeURIComponent(g)}">${g}</a>`).join('');
  renderContinue();
  document.addEventListener('as:synced', renderContinue);      // Progress arrived from another device
  placeTop10();
  wireTabs();
  initSchedule();

  latestReq.then(renderLatest).catch(() => {
    $('#rail-latest').style.display = 'none';
    LATEST_ITEMS = []; if (discoverKey === 'latest') setDiscover('latest');
  });

  /* Trending row: paints the first list, then upgrades to the weekly ranking without waiting or re-rendering when the order is unchanged */
  let trendRank = 0, trendSig = '';
  const paintTrending = (list, rank) => {
    if (!list || !list.length || rank < trendRank) return;
    trendRank = rank;
    RAILS.trending = list;
    const sig = list.map(m => m.id).join();
    if (sig !== trendSig) {
      trendSig = sig;
      const left = $('#rail-trending .rail-track')?.scrollLeft || 0;          // Keep the row where the user scrolled it
      renderRail('#rail-trending', 'Trending this week', list, { badge: 'HOT', href: 'browse.html?sort=TRENDING_DESC' });
      if (left) $('#rail-trending .rail-track').scrollTo({ left, behavior: 'instant' });
    }
    if ($('#top-tabs .tab.on')?.dataset.tab === 'trending') setTop('trending');
  };
  quickReq.then(d => paintTrending(d.Page.media.slice(0, 18), 1)).catch(() => {});
  weeklyReq.then(weekly => { if (weekly && weekly.length >= 8) paintTrending(weekly.slice(0, 18), 2); });

  try {
    const data = await homeReq;
    RAILS = {
      topAiring: data.topAiring.media,
      season: data.seasonPopular.media,
      top: data.topRated.media,
      trending: trendRank ? RAILS.trending : data.trending.media,
      topRated: data.topRated.media,
    };

    renderHero(data.trending.media.slice(0, 8));
    $('#rail-upcoming').innerHTML = `
      <div class="block-head"><h2 class="sec-title">Coming soon</h2>
        <a class="rail-link" href="browse.html?status=NOT_YET_RELEASED">view all &rarr;</a></div>
      ${gridHTML(data.upcoming.media)}`;

    setDiscover(discoverKey);
    setTop($('#top-tabs .tab.on')?.dataset.tab || 'topAiring');
    if (!trendRank) paintTrending(RAILS.trending, 1);   // Slim query failed: fall back to the big query's trending list
  } catch (err) {
    hero.innerHTML = `<div class="container" style="padding-top:120px">
      <h1>Couldn't load AniList</h1><p class="muted">${esc(err.message)}</p></div>`;
    $('#discover-grid').innerHTML = '';
    if (!trendRank) $('#rail-trending').style.display = 'none';
  }
}

/* Latest episodes */
function renderLatest(rows) {
  LATEST_CTX = { seen: Store.seen(), prog: Store.progress() };
  const seen = new Set(), items = [];
  for (const s of rows) {
    const m = s.media;
    if (!m || (m.isAdult && !adultOn()) || m.countryOfOrigin !== 'JP' || seen.has(m.id)) continue;
    seen.add(m.id);
    items.push({ m, ep: s.episode, at: s.airingAt });
    if (items.length >= 24) break;
  }
  LATEST_ITEMS = items;
  if (discoverKey === 'latest') setDiscover('latest');
  const el = $('#rail-latest');
  if (!items.length) { el.style.display = 'none'; return; }
  renderRail(el, 'Latest episodes', items.slice(0, 18),
    { href: 'browse.html?sort=LATEST_EPISODES', hrefLabel: 'Latest episodes \u2192', card: latestCardHTML });
}

let heroTimer;
function renderHero(items) {
  const hero = $('#hero');
  const slides = items.filter(m => bannerOf(m)).slice(0, 6);
  if (!slides.length) return;

  hero.innerHTML = slides.map((m, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" data-i="${i}">
      <img class="hero-bg" src="${bannerOf(m)}" alt="" ${i ? 'loading="lazy"' : ''}>
      <div class="container hero-content">
        <div class="spot-tag">#${i + 1} Spotlight</div>
        <h1>${esc(titleOf(m))}</h1>
        <div class="hero-meta">
          ${scoreOf(m) ? `<span class="chip-s accent">&#9733; ${scoreOf(m)}</span>` : ''}
          ${fmtLabel(m) ? `<span class="chip-s">${esc(fmtLabel(m))}</span>` : ''}
          <span class="chip-s">${esc(epLabel(m))}</span>
          ${m.seasonYear ? `<span class="chip-s">${m.seasonYear}</span>` : ''}
          ${statusLabel(m) ? `<span class="chip-s">${esc(statusLabel(m))}</span>` : ''}
        </div>
        <p class="hero-desc">${esc(stripTags(m.description || ''))}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="watch.html?id=${m.id}&ep=1">&#9654; Watch now</a>
          <a class="btn btn-ghost" href="anime.html?id=${m.id}">More info</a>
        </div>
      </div>
    </div>`).join('') +
    `<div class="hero-dots">${slides.map((_, i) =>
      `<button data-dot="${i}" aria-label="Slide ${i + 1}" class="${i === 0 ? 'on' : ''}"></button>`).join('')}</div>
     <div class="hero-ctrl"><button id="hero-prev" aria-label="Previous">&lsaquo;</button><button id="hero-next" aria-label="Next">&rsaquo;</button></div>`;

  let cur = 0;
  const show = i => {
    cur = (i + slides.length) % slides.length;
    $$('.hero-slide', hero).forEach(s => s.classList.toggle('active', +s.dataset.i === cur));
    $$('.hero-dots button', hero).forEach(d => d.classList.toggle('on', +d.dataset.dot === cur));
  };
  const restart = () => { clearInterval(heroTimer); if (Settings.get().reduceMotion) return; heroTimer = setInterval(() => show(cur + 1), 7000); };   // Reduce motion: no auto-advance
  $$('.hero-dots button', hero).forEach(b => b.onclick = () => { show(+b.dataset.dot); restart(); });
  $('#hero-prev').onclick = () => { show(cur - 1); restart(); };
  $('#hero-next').onclick = () => { show(cur + 1); restart(); };
  hero.addEventListener('mouseenter', () => clearInterval(heroTimer));
  hero.addEventListener('mouseleave', restart);
  restart();
}

/* Phones: the Top 10 card sits at the bottom of the page, right above Genres; larger screens keep it beside the spotlight */
const topMQ = window.matchMedia('(max-width:900px)');
function placeTop10() {
  const card = $('.bento-side .side-card') || $('.home-side .side-sticky > #top-card');
  const side = $('.bento-side'), dock = $('.home-side .side-sticky');
  if (!card || !side || !dock) return;
  card.id = 'top-card';
  const apply = () => {
    if (topMQ.matches) { dock.insertBefore(card, dock.firstElementChild); side.hidden = true; }
    else { side.appendChild(card); side.hidden = false; }
  };
  apply();
  if (topMQ.addEventListener) topMQ.addEventListener('change', apply);
}

function wireTabs() {
  wireDiscoverPicker();
  $$('#top-tabs .tab').forEach(t => t.onclick = () => {
    $$('#top-tabs .tab').forEach(x => x.classList.remove('on'));
    t.classList.add('on'); setTop(t.dataset.tab);
  });
}
/* Discover: popup picker instead of tabs */
const DISCOVER = [
  { key: 'topAiring', label: 'Top airing',      desc: 'Most popular shows airing now', ic: 'play' },
  { key: 'latest',    label: 'Latest episodes', desc: 'Newly aired episodes, newest first', ic: 'clock' },
  { key: 'season',    label: 'This season',     desc: 'Popular this season', ic: 'calendar' },
  { key: 'top',       label: 'Top rated',       desc: 'Highest rated of all time', ic: 'star' },
];
let discoverKey = 'topAiring', LATEST_ITEMS = null;       // null means still loading
/* Phones (same breakpoint as the bottom nav) show 15 titles in Discover; larger screens show everything */
const DISCOVER_MOBILE_MAX = 15, mobileMQ = window.matchMedia('(max-width:900px)');
const discoverCap = list => mobileMQ.matches ? (list || []).slice(0, DISCOVER_MOBILE_MAX) : list;
if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', () => setDiscover(discoverKey));
function setDiscover(key) {
  if (!DISCOVER.some(d => d.key === key)) key = 'topAiring';
  discoverKey = key;
  const cur = DISCOVER.find(d => d.key === key);
  $('#discover-label').textContent = cur.label;
  $('#discover-ic').innerHTML = icon(cur.ic, 16);
  $$('#discover-pop .picker-opt').forEach(o => {
    const on = o.dataset.key === key;
    o.classList.toggle('on', on); o.setAttribute('aria-selected', on);
  });
  const grid = $('#discover-grid');
  if (key === 'latest') {
    if (LATEST_ITEMS === null) grid.innerHTML = skeletonGrid(12);
    else if (!LATEST_ITEMS.length) grid.innerHTML = '<p class="empty">Couldn\'t load the latest episodes. Try again in a moment.</p>';
    else grid.innerHTML = `<div class="grid">${discoverCap(LATEST_ITEMS).map(latestCardHTML).join('')}</div>`;
  } else grid.innerHTML = gridHTML(discoverCap(RAILS[key]));
}
function wireDiscoverPicker() {
  const btn = $('#discover-btn'), pop = $('#discover-pop'), back = $('#discover-back');
  pop.innerHTML = DISCOVER.map(d => `
    <button class="picker-opt" type="button" role="option" data-key="${d.key}">
      <span class="picker-sq">${icon(d.ic, 18)}</span>
      <span class="picker-txt"><strong>${d.label}</strong><span>${d.desc}</span></span>
      <svg class="picker-tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
    </button>`).join('');
  const open = on => {
    pop.classList.toggle('open', on); back.classList.toggle('open', on);
    btn.setAttribute('aria-expanded', on);
    if (on) (pop.querySelector('.picker-opt.on') || pop.querySelector('.picker-opt')).focus({ preventScroll: true });
  };
  btn.onclick = e => { e.stopPropagation(); open(!pop.classList.contains('open')); };
  back.onclick = () => open(false);
  pop.addEventListener('click', e => {
    const o = e.target.closest('.picker-opt'); if (!o) return;
    setDiscover(o.dataset.key); open(false); btn.focus();
  });
  document.addEventListener('click', e => { if (!e.target.closest('#discover-picker')) open(false); });
  document.addEventListener('keydown', e => {
    if (!pop.classList.contains('open')) return;
    if (e.key === 'Escape') { open(false); btn.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const opts = [...pop.querySelectorAll('.picker-opt')], i = opts.indexOf(document.activeElement);
    opts[(i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length].focus();
  });
  setDiscover(discoverKey);
}
function setTop(key) {
  const items = (RAILS[key] || []).slice(0, 10);
  $('#top-list').innerHTML = items.map((m, i) => `
    <a class="top-row" href="anime.html?id=${m.id}">
      <div class="top-rank">${String(i + 1).padStart(2, '0')}</div>
      <img loading="lazy" decoding="async" src="${thumbOf(m)}" alt="">
      <div class="top-info">
        <strong>${esc(titleOf(m))}</strong>
        <span>${scoreOf(m) ? '\u2605 ' + scoreOf(m) + ' &middot; ' : ''}${esc(fmtLabel(m))} &middot; ${esc(epLabel(m))}</span>
      </div>
    </a>`).join('');
}

/* Estimated schedule: always GMT+8 (Manila), 12-hour clock */
const SCHED_TZ = 'Asia/Manila', MNL_OFFSET = 8 * 3600000, DAY_MS = 86400000;
const SCHED_CACHE = {};
let schedToken = 0, schedActive = 0;
const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: SCHED_TZ, hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDow = new Intl.DateTimeFormat('en-US', { timeZone: SCHED_TZ, weekday: 'short' });
const fmtDom = new Intl.DateTimeFormat('en-US', { timeZone: SCHED_TZ, day: 'numeric' });
const fmtMon = new Intl.DateTimeFormat('en-US', { timeZone: SCHED_TZ, month: 'short' });

function manilaMidnight(ms) {
  const d = new Date(ms + MNL_OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - MNL_OFFSET;
}
function schedClock() { $('#sched-tz').textContent = 'GMT+8 \u00b7 ' + fmtTime.format(Date.now()); }

function initSchedule() {
  const today = manilaMidnight(Date.now());
  const days = Array.from({ length: 7 }, (_, i) => today + i * DAY_MS);
  schedClock();
  $('#sched-days').innerHTML = days.map((d, i) => `
    <button class="sched-day ${i === 0 ? 'on' : ''}" data-i="${i}">
      ${fmtDow.format(d + 3600000)}
      <strong>${fmtDom.format(d + 3600000)}</strong>
      ${fmtMon.format(d + 3600000)}
    </button>`).join('');
  $$('.sched-day').forEach(b => {
    b.onclick = () => {
      $$('.sched-day').forEach(x => x.classList.toggle('on', x === b));
      loadSchedule(days[+b.dataset.i]);
    };
    b.onmouseenter = () => fetchDay(days[+b.dataset.i]).catch(() => {});   // Warm the cache before the click
  });
  loadSchedule(days[0]);
  setInterval(() => { schedClock(); markSchedule(false); }, 30000);
}
function fetchDay(start) {
  if (!SCHED_CACHE[start]) {
    const from = Math.floor(start / 1000) - 1;
    SCHED_CACHE[start] = Api.schedule(from, from + 86401).then(rows => {
      const seen = new Set();
      return rows
        .filter(s => s.media && s.media.countryOfOrigin === 'JP')            // Api.schedule already dropped 18+ rows unless enabled
        .sort((a, b) => a.airingAt - b.airingAt)
        .filter(s => { const k = s.media.id + ':' + s.episode; if (seen.has(k)) return false; seen.add(k); return true; });
    }).catch(err => { delete SCHED_CACHE[start]; throw err; });
  }
  return SCHED_CACHE[start];
}
/* Today's list: dim what already aired, flag the next episode and scroll to it */
function markSchedule(scroll) {
  const box = $('#sched-list');
  if (!box) return;
  const isToday = schedActive === manilaMidnight(Date.now()), now = Date.now() / 1000;
  let next = null, airedCount = 0;
  $$('.sched-row', box).forEach(r => {
    const aired = isToday && +r.dataset.at <= now;
    r.classList.toggle('aired', aired);
    r.classList.remove('next');
    if (aired) airedCount++;
    else if (isToday && !next) next = r;
  });
  if (next) next.classList.add('next');
  if (scroll && next && airedCount > 2) box.scrollTop = Math.max(0, next.offsetTop - 70);
}
async function loadSchedule(start) {
  const box = $('#sched-list'), token = ++schedToken;
  schedActive = start;
  box.innerHTML = '<div class="sk" style="height:220px;border-radius:0"></div>';
  try {
    const rows = await fetchDay(start);
    if (token !== schedToken) return;
    box.innerHTML = rows.length ? rows.map(s => `
      <a class="sched-row" data-at="${s.airingAt}" href="anime.html?id=${s.media.id}">
        <span class="sched-time">${fmtTime.format(s.airingAt * 1000)}</span>
        <span class="sched-title">${esc(titleOf(s.media))}</span>
        <span class="sched-flag"></span>
        <span class="sched-ep">Episode ${s.episode}</span>
      </a>`).join('') : '<p class="empty">No episodes scheduled.</p>';
    box.scrollTop = 0;
    markSchedule(true);
  } catch (err) {
    if (token === schedToken) box.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

let contSig = '';
function paintContinue(items) {
  const el = $('#rail-continue');
  if (!items.length || !Settings.get().continueRow) { el.style.display = 'none'; contSig = ''; return; }
  const sig = items.map(x => `${x.id}:${x.ep}:${x.avail}:${x.fresh}`).join('|');
  if (sig === contSig) return;                       // Nothing changed since the first paint
  contSig = sig;
  el.style.display = '';
  el.innerHTML = `
    <div class="container rail-head"><h2>Continue watching</h2>
      <a class="rail-link" href="mylist.html">My list &rarr;</a></div>
    <div class="rail-wrap"><div class="rail-track">${items.map(continueCardHTML).join('')}</div></div>`;
}
function renderContinue() {
  if (!Settings.get().continueRow) { paintContinue([]); return; }
  paintContinue(Continue.quick());                    // Instant, from storage
  Continue.load().then(paintContinue).catch(() => {}); // Then add new-episode badges
}

document.addEventListener('DOMContentLoaded', initHome);
