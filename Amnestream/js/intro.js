/* Intro hero and page-wide motion: poster columns, parallax, eased scrolling, scroll reveals */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || (typeof Settings !== 'undefined' && !!Settings.get().reduceMotion);   // OS setting or Settings > Reduce motion
  const $ = (s, r = document) => r.querySelector(s);

  /* Wordmark: typed in with a blinking caret */
  const wordEl = $('.intro-word');
  const caret = document.createElement('span');
  caret.className = 'caret'; caret.textContent = '|'; caret.setAttribute('aria-hidden', 'true');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function split(el, cls = () => '') {
    const text = el.getAttribute('aria-label') || el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((c, i) => `<span class="ch${cls(i)}" aria-hidden="true">${c}</span>`).join('');
    return [...el.children];
  }
  const wordSpans = wordEl ? split(wordEl, i => (i >= 4 ? ' st' : '')) : [];   // "stream" is tinted by the theme
  let caretAt = null;                                  // [span, afterIt]
  function place(span, after = true) {
    if (!span) return;
    caretAt = [span, after];
    span.parentElement.appendChild(caret);
    caret.style.left = span.offsetLeft + (after ? span.offsetWidth : 0) + 'px';
    caret.style.top = span.offsetTop + 'px';
  }
  async function typeLine(spans) {
    if (!spans.length) return;
    place(spans[0], false); caret.classList.add('typing');
    for (const s of spans) { s.classList.add('on'); place(s); await sleep(75 + Math.random() * 65); }
  }
  async function runTyping() {
    if (reduce) { wordSpans.forEach(s => s.classList.add('on')); place(wordSpans.at(-1)); return; }
    place(wordSpans[0], false);
    await sleep(450);
    await typeLine(wordSpans);
    caret.classList.remove('typing');                  // Idle: blink after the last letter (the Japanese line is static)
  }
  runTyping();
  const replace = () => caretAt && place(...caretAt);
  addEventListener('resize', replace);
  if (document.fonts?.ready) document.fonts.ready.then(replace);

  /* Poster columns */
  const RATIOS = ['3/4', '2/3', '1/1', '3/4', '4/5', '2/3'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function cardHTML(m, i) {
    const t = typeof titleOf === 'function' ? titleOf(m) : (m.title.english || m.title.romaji);
    const href = m.fake ? '#' : `anime.html?id=${m.id}`;
    const col = m.coverImage?.color || '#2a303d';
    const img = m.fake ? '' : `<img src="${esc(m.coverImage.large)}" alt="" loading="eager" decoding="async" draggable="false">`;
    const av = m.user?.avatar
      ? `<img class="iu-av" src="${esc(m.user.avatar)}" alt="" loading="eager" decoding="async" draggable="false">`
      : `<i class="iu-av" style="--c:${esc(col)}"></i>`;
    return `<a class="icard" href="${href}" tabindex="-1">
      <span class="icard-frame">
        <span class="icard-img" style="aspect-ratio:${RATIOS[i % RATIOS.length]};background:${esc(col)}">${img}</span>
        <span class="icard-name">${esc(t)}</span>
      </span>
      <span class="icard-user">${av}<span>${esc(m.user?.name || 'anon')}</span></span></a>`;
  }

  const tracks = [...document.querySelectorAll('.icol-track')];
  const halves = tracks.map(() => 1);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => {
    const i = tracks.indexOf(e.target); if (i >= 0) halves[i] = Math.max(1, e.target.offsetHeight / 2);
    moveCols(true);                      // Re-wrap against the new column height
  })) : null;
  tracks.forEach(t => ro && ro.observe(t));

  function fillColumns(items) {
    if (!tracks.length) return;
    const list = items.filter(m => m && m.coverImage);
    tracks.forEach((track, c) => {
      let mine = list.filter((_, i) => i % tracks.length === c);
      if (mine.length > 1 && mine.length % 2) mine = mine.slice(0, -1);
      const half = mine.map((m, i) => cardHTML(m, i + c * 2)).join('');
      track.innerHTML = half + half;                 // Duplicated so the scroll offset can wrap seamlessly
      track.setAttribute('aria-hidden', 'true');
      track.classList.add('ready');                  // Fade in once everything has loaded
      halves[c] = Math.max(1, track.offsetHeight / 2);
    });
  }

  const preload = urls => Promise.all(urls.map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })));
  const IMG_Q = 'id isAdult title{romaji english native} coverImage{large color}';

  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Random picks from AniList trending (new order each load), each paired with a recent AniList user
  async function loadItems() {
    const trendingReq = gql(`query{Page(page:1,perPage:50){media(type:ANIME,sort:TRENDING_DESC,isAdult:false){${IMG_Q} status episodes nextAiringEpisode{episode}}}}`, {}, { ttl: 15 * 60e3 });
    const usersReq = gql(`query{Page(page:1,perPage:50){activities(type:MEDIA_LIST,sort:ID_DESC){
      ... on ListActivity{user{name avatar{medium}}}}}}`, {}, { ttl: 5 * 60e3 }).catch(() => null);
    const [t, u] = await Promise.all([trendingReq, usersReq]);
    const seen = new Set();
    const users = shuffle((u?.Page.activities || []).filter(a => a.user && !seen.has(a.user.name) && seen.add(a.user.name))
      .map(a => ({ name: a.user.name, avatar: a.user.avatar?.medium })));
    return shuffle(t.Page.media.filter(m => !m.isAdult && (typeof hasEpisodes !== 'function' || hasEpisodes(m)))).slice(0, 20)
      .map((m, i) => ({ ...m, user: users.length ? users[i % users.length] : { name: 'anon' } }));
  }

  if (typeof gql === 'function') {
    loadItems().then(items => preload(items.flatMap(m => [m.coverImage.large, m.user.avatar].filter(Boolean)))
      .then(() => fillColumns(items))).catch(() => {});
  }

  /* Eased (inertial) scrolling */
  const doc = document.documentElement;
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  let cur = scrollY, target = scrollY, raf = 0, selfScroll = false;
  const max = () => doc.scrollHeight - innerHeight;
  const clamp = v => Math.max(0, Math.min(max(), v));

  function insideScroller(el, dy) {
    for (; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
    }
    return false;
  }

  function tick() {
    cur += (target - cur) * 0.085;
    if (Math.abs(target - cur) < 0.15) cur = target;
    selfScroll = true; scrollTo(0, cur);
    update();
    raf = cur === target ? 0 : requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  if (!reduce && !isCoarse) {
    doc.classList.add('smooth');
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.defaultPrevented) return;          // Pinch-zoom or handled elsewhere
      if (insideScroller(e.target, e.deltaY)) return;        // Let inner panels scroll natively
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 34 : e.deltaMode === 2 ? innerHeight : 1;
      target = clamp(target + e.deltaY * unit * 0.9);
      kick();
    }, { passive: false });
    // Keyboard, scrollbar drag and anchor jumps adopt the native position
    addEventListener('scroll', () => {
      if (selfScroll) { selfScroll = false; return; }
      cur = target = scrollY; update();
    }, { passive: true });
    addEventListener('resize', () => { target = clamp(target); });
  }

  /* Parallax and scroll-driven poster columns */
  const bg = $('.intro-bg'), copy = $('.intro-copy'), cols = $('.intro-cols'), intro = $('.intro');
  const bgSpans = [...document.querySelectorAll('.intro-bg span')];
  const COL_SPEED = 0.6;                 // Px the columns travel per px scrolled
  let mx = 0, my = 0, smx = 0, smy = 0, colCur = scrollY * COL_SPEED;

  function moveCols(force) {
    const t = scrollY * COL_SPEED;
    colCur += (t - colCur) * 0.14;       // Slight lag so columns settle softly
    if (!force && Math.abs(t - colCur) < 0.05) return;
    tracks.forEach((tr, i) => {
      const h = halves[i], o = ((colCur % h) + h) % h;
      tr.style.transform = `translate3d(0,${i % 2 === 0 ? -o : o - h}px,0)`;   // Columns travel in opposite directions
    });
  }

  function update() {
    if (!intro) return;
    const y = scrollY, h = intro.getBoundingClientRect().height;
    if (y > h * 1.1) return;
    const p = Math.min(1, y / h);
    if (bg) bg.style.transform = `translate3d(${smx * -14}px,${y * 0.18 + smy * -10}px,0)`;
    bgSpans.forEach((s, i) => { s.style.transform = `translate3d(${(i % 2 ? -1 : 1) * y * 0.07}px,0,0)`; });
    if (copy) { copy.style.transform = `translate3d(0,${y * 0.38}px,0)`; copy.style.opacity = String(1 - p * 1.25); }
    if (cols) cols.style.transform = `translate3d(${smx * 10}px,${y * -0.12}px,0)`;
  }
  moveCols(true);
  if (!reduce) {
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    (function loop() {
      smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
      if (scrollY < innerHeight * 1.1) { update(); moveCols(); }
      requestAnimationFrame(loop);
    })();
    addEventListener('scroll', update, { passive: true });
  }

  /* Reveal sections as they enter */
  const targets = document.querySelectorAll('main > .bento, main > .rail, main .home-cols .block, main .home-side .side-card');
  targets.forEach(el => el.classList.add('rv'));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      setTimeout(() => en.target.classList.add('done'), 1200);
      io.unobserve(en.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    targets.forEach(el => io.observe(el));
  } else targets.forEach(el => el.classList.add('in'));

  // Scroll cue jumps to the content
  const cue = $('.intro-cue');
  if (cue) cue.addEventListener('click', () => {
    target = clamp(intro.getBoundingClientRect().height - 10);
    if (doc.classList.contains('smooth')) kick(); else scrollTo({ top: target, behavior: 'smooth' });
  });
})();
