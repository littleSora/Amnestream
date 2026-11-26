/* Theme fonts (Voxel, Cyberpunk, Terminal, Blueprint, Parchment, Noir, Brutal) start loading right here, before the first paint,
   instead of after common.js has run. common.js reads the same list (window.AS_THEME_FONTS) and finds this <link> already in place. */
(function () {
  try {
    var F = window.AS_THEME_FONTS = { cyberpunk: 'Orbitron:wght@600;800', voxel: 'VT323', terminal: 'JetBrains+Mono:wght@400;700', blueprint: 'IBM+Plex+Mono:wght@400;600',
      parchment: 'Playfair+Display:ital,wght@0,700;1,700', noir: 'Playfair+Display:ital,wght@0,700;1,700', brutal: 'Space+Grotesk:wght@400;700' };
    var f = F[document.documentElement.dataset.theme];
    if (f && !document.getElementById('as-theme-font')) {
      var l = document.createElement('link'); l.id = 'as-theme-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + f + '&display=swap';
      document.head.appendChild(l);
    }
  } catch (e) { }
})();

/* Sidebar rail (desktop): the highlight behind the open page is one pill that slides from the page you just left to the one you opened.
   Every page is a fresh load, so the old position is remembered for this tab (sessionStorage). seed() runs before the first paint with the cached rail
   and puts the pill on the old link; go() runs once common.js has built the real rail and slides it over. */
(function () {
  var KEY = 'as_rail_i';
  var R = window.AsRail = {
    start: null, done: false,
    nav: function () { var h = document.getElementById('site-header'); return h && h.querySelector('.main-nav'); },
    cur: function (nav) { var a = nav.querySelectorAll('a'); for (var i = 0; i < a.length; i++) if (a[i].classList.contains('on')) return i; return -1; },
    place: function (nav, ink, i) {
      var a = nav.querySelectorAll('a')[i]; if (!a || !a.offsetWidth) return;
      ink.style.width = a.offsetWidth + 'px'; ink.style.height = a.offsetHeight + 'px';
      ink.style.borderRadius = getComputedStyle(a).borderRadius;
      ink.style.transform = 'translate(' + a.offsetLeft + 'px,' + a.offsetTop + 'px)';
    },
    ink: function (nav) {
      var ink = nav.querySelector('.rail-ink');
      if (!ink) { ink = document.createElement('span'); ink.className = 'rail-ink'; ink.setAttribute('aria-hidden', 'true'); nav.insertBefore(ink, nav.firstChild); }
      nav.classList.add('has-ink');
      return ink;
    },
    seed: function () {
      try {
        if (window.matchMedia('(max-width:900px)').matches) return;
        var nav = R.nav(); if (!nav) return;
        var cur = R.cur(nav);
        if (R.start === null) {
          var p = NaN; try { p = parseInt(sessionStorage.getItem(KEY), 10); } catch (e) { }
          R.start = (p >= 0 && p <= 3 && p !== cur) ? p : cur;
        }
        var ink = R.ink(nav), at = R.start >= 0 ? R.start : cur;
        if (at >= 0) R.place(nav, ink, at);
        ink.style.opacity = R.start >= 0 ? '1' : '0';
      } catch (e) { }
    },
    go: function () {
      if (R.done) return;
      try {
        if (window.matchMedia('(max-width:900px)').matches) return;
        var nav = R.nav(); if (!nav) return;
        if (R.start === null || !nav.querySelector('.rail-ink')) R.seed();   // common.js replaced the rail: put the pill back where it was
        var ink = R.ink(nav), cur = R.cur(nav);
        R.done = true;
        void ink.offsetWidth;                                                  // The start position is painted before it moves
        ink.classList.add('ready');
        if (cur >= 0) { R.place(nav, ink, cur); ink.style.opacity = '1'; } else ink.style.opacity = '0';
        try { sessionStorage.setItem(KEY, String(cur)); } catch (e) { }
        window.addEventListener('resize', function () {
          var n = R.nav(), k = n && n.querySelector('.rail-ink'), c = n && R.cur(n);
          if (k && c >= 0) { k.classList.remove('ready'); R.place(n, k, c); void k.offsetWidth; k.classList.add('ready'); }
        });
      } catch (e) { }
    }
  };
  R.seed();
  window.addEventListener('load', function () { setTimeout(R.go, 400); });   // If common.js never builds the rail, still finish
})();

/* Floating navigation dock.
   - Built synchronously before the first paint, so it never blinks or slides between pages.
   - Lives on the left (default), the right or the bottom. Press and hold it for a moment, then drag it to a glowing edge (the same gesture as the settings panel).
     Where you drop it along that edge is remembered on this device.
   - Swipe it towards its edge to hide it. Tap or drag the little edge tab to bring it back (on the left and right you can also swipe in from the page).
     The hidden state is remembered for this browser tab, but opening Home, Browse, Timeline or My List always shows it again.
   - While the page is scrolling it is see-through. 1 second after scrolling stops it is fully visible, and 1.5 seconds later it settles to a softer see-through level.
     Touching or hovering it brings it back to fully visible.
   - Size comes from Settings > Navigation size (html[data-dock]); it is read here too so the first frame is already the right size. */
(function () {
  'use strict';
  if (window.AmDock) return;

  const NAV = [
    ['index.html',    'Home',     '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
    ['browse.html',   'Browse',   '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'],
    ['timeline.html', 'Timeline', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
    ['mylist.html',   'My List',  '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'],
  ];
  const ROOTS = NAV.map(n => n[0]);
  const KEY = 'as_dock_hidden', SIDE_KEY = 'as_dock_side', POS_KEY = 'as_dock_pos';
  const HOLD_MS = 420, IDLE_MS = 1500, SCROLL_END_MS = 1000;
  const SETTLE = true;        // 1.5 s after it becomes visible it settles to a softer see-through level (css --dk-idle)
  const page = location.pathname.split('/').pop() || 'index.html';
  const root = document.documentElement;
  const svg = (p, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  const store = {
    get() { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } },
    set(v) { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { } },
  };
  const lget = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lset = (k, v) => { try { localStorage.setItem(k, v); } catch { } };

  /* Size: the setting is already in localStorage, so the right size is there from the very first frame */
  try {
    const st = JSON.parse(lget('as_settings') || '{}');
    root.dataset.dock = st.dockSize === 'small' || st.dockSize === 'large' ? st.dockSize : 'medium';
    root.dataset.dockStyle = st.dockStyle === 'pill' ? 'pill' : 'orbs';
  } catch { root.dataset.dock = 'medium'; root.dataset.dockStyle = 'orbs'; }

  /* Side and position along the edge. pos.y is used on the left and right (share of the screen height), pos.x at the bottom (share of the width) */
  let side = lget(SIDE_KEY); if (side !== 'l' && side !== 'r' && side !== 'b') side = 'l';
  const pos = { y: .5, x: .5 };
  try { const o = JSON.parse(lget(POS_KEY) || '{}'); if (o.y > 0 && o.y < 1) pos.y = o.y; if (o.x > 0 && o.x < 1) pos.x = o.x; } catch { }
  const posPct = () => ((side === 'b' ? pos.x : pos.y) * 100).toFixed(2) + '%';
  const HIDE = { l: [-1, 0], r: [1, 0], b: [0, 1] };        // the way the bar slides to hide itself

  const isRoot = ROOTS.includes(page);
  if (isRoot) store.set(false);                       // Landing on a main page always brings the dock back

  const active = ROOTS.indexOf(page);
  /* The highlight remembers where it was on the page you just left (this tab only). It is drawn there first and then slides to the new page,
     exactly like the sidebar rail on a computer. Leaving the four main pages fades it out, coming back to them fades it in. */
  const IKEY = 'as_dock_i';
  let prev = -2;
  try { const v = sessionStorage.getItem(IKEY); if (v !== null) prev = parseInt(v, 10); } catch { }
  try { sessionStorage.setItem(IKEY, String(active)); } catch { }
  const startAt = prev >= 0 && prev <= 3 && prev !== active ? prev : active;         // where the highlight starts
  const mode = prev >= 0 && prev <= 3 && prev !== active ? (active > -1 ? 'slide' : 'out') : (prev === -1 && active > -1 ? 'in' : '');
  const el = document.createElement('div');
  el.id = 'am-dock';
  el.className = 'dk no-anim';
  el.dataset.side = side;
  el.style.setProperty('--dk-pos', posPct());
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Main');
  el.style.setProperty('--i', startAt > -1 ? startAt : Math.max(active, 0));
  el.innerHTML =
    '<div class="dk-pill" data-no-swipe>' +
      '<span class="dk-grip" aria-hidden="true"></span>' +
      (active > -1 || mode === 'out' ? `<span class="dk-ink${mode === 'in' ? ' is-away' : ''}" aria-hidden="true"></span>` : '') +
      NAV.map(([href, label, path], i) =>
        `<a class="dk-item${i === startAt ? ' on' : ''}" href="${href}" aria-label="${label}"${i === active ? ' aria-current="page"' : ''} draggable="false">` +
          svg(path, 21) + `<span class="dk-tip">${label}</span></a>`).join('') +
    '</div>' +
    `<button class="dk-peek" type="button" aria-label="Show navigation">${svg('<path d="M9 6l6 6-6 6"/>', 16)}</button>`;

  const pill = el.querySelector('.dk-pill');
  const peek = el.querySelector('.dk-peek');
  let hidden = !isRoot && store.get();
  const mount = () => { document.body.insertBefore(el, document.body.firstChild); syncBot(); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  /* How far the bar has to travel to be completely off screen */
  const hideDist = () => (side === 'b' ? pill.offsetHeight + 24 + 34 : pill.offsetWidth + 24);

  /* While the bar sits at the bottom, the page, toasts and the settings panel keep clear of it (css/dock.css reads --dk-bot) */
  function syncBot() {
    const v = side === 'b' && !hidden && el.isConnected ? Math.round(pill.offsetHeight + 10) : 0;
    root.style.setProperty('--dk-bot', v + 'px');
    root.classList.toggle('dk-at-bottom', v > 0);
  }
  if (window.ResizeObserver) new ResizeObserver(syncBot).observe(pill);   // The size setting changed

  const setOff = (x, y) => { el.style.setProperty('--dx', x + 'px'); el.style.setProperty('--dy', y + 'px'); };
  const clearOff = () => { el.style.removeProperty('--dx'); el.style.removeProperty('--dy'); };

  function apply(h, persist) {
    hidden = h;
    el.classList.toggle('is-hidden', h);
    pill.toggleAttribute('inert', h);
    peek.tabIndex = h ? 0 : -1;
    peek.setAttribute('aria-hidden', String(!h));
    clearOff();
    if (persist) store.set(h);
    syncBot();
    wake();
  }

  /* ---- See-through while scrolling; visible when scrolling stops; softly see-through again 1.5 seconds later ----
     is-scrolling = most see-through (the page is moving). is-idle = softly see-through (1.5 s after the last scroll or touch). Neither = fully visible. */
  let idleT = 0, scrollT = 0, over = false;
  function arm() {                                       // Start the 1.5 second countdown to the soft see-through level
    clearTimeout(idleT);
    idleT = setTimeout(function tick() {
      if (over || drag || pd || sw) { idleT = setTimeout(tick, 600); return; }   // Not while a finger or the pointer is on it
      if (SETTLE) el.classList.add('is-idle');
    }, IDLE_MS);
  }
  function wake() {                                      // Touch, hover, focus, show/hide: fully visible, then the countdown
    clearTimeout(scrollT);
    el.classList.remove('is-scrolling', 'is-idle');
    arm();
  }
  function onScroll() {                                  // The page or any row that scrolls
    clearTimeout(idleT);
    el.classList.remove('is-idle');
    el.classList.add('is-scrolling');
    clearTimeout(scrollT);
    scrollT = setTimeout(() => {                         // No scroll event for a moment: scrolling has stopped
      el.classList.remove('is-scrolling');
      arm();
    }, SCROLL_END_MS);
  }
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  pill.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') over = true; wake(); });
  pill.addEventListener('pointerleave', () => { over = false; wake(); });
  pill.addEventListener('focusin', wake);

  apply(hidden, false);
  /* Two frames later the start position has been painted, so now let the highlight travel */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.remove('no-anim');
    syncBot();
    if (!mode) return;
    void el.offsetWidth;
    const ink = el.querySelector('.dk-ink'), items = el.querySelectorAll('.dk-item');
    if (mode === 'slide' || mode === 'in') el.style.setProperty('--i', active);
    items.forEach((a, i) => a.classList.toggle('on', i === active));
    if (ink && mode === 'in') ink.classList.remove('is-away');
    if (ink && mode === 'out') { ink.classList.add('is-away'); setTimeout(() => ink.remove(), 500); }
  }));

  /* Warm the next page as soon as a finger or pointer lands on a dock item */
  const warmed = new Set();
  const warm = e => {
    const a = e.target.closest && e.target.closest('.dk-item');
    const h = a && a.getAttribute('href');
    if (!h || warmed.has(h) || h === page) return;
    warmed.add(h);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = h; document.head.appendChild(l);
  };
  el.addEventListener('pointerdown', warm, { passive: true });
  el.addEventListener('pointerover', warm, { passive: true });

  /* ---- Drop zones (left, right, bottom) shown while the bar is being carried ---- */
  let zonesEl = null;
  const zones = () => {
    if (zonesEl) return zonesEl;
    zonesEl = document.createElement('div'); zonesEl.id = 'dk-zones'; zonesEl.setAttribute('aria-hidden', 'true');
    zonesEl.innerHTML = '<div class="dk-glow l"><span>Left</span></div><div class="dk-glow r"><span>Right</span></div><div class="dk-glow b"><span>Bottom</span></div><div class="dk-holdhint">Drop it on a glowing edge</div>';
    document.body.appendChild(zonesEl);
    return zonesEl;
  };
  /* The bottom is the lower fifth of the screen; the sides are the outer quarters above it; the middle keeps the current edge */
  const zoneAt = (x, y) => y > innerHeight * .78 ? 'b' : x < innerWidth * .28 ? 'l' : x > innerWidth * .72 ? 'r' : '';
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { } };
  const still = () => root.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Put the bar on a side and position (nothing animates here) */
  function place(newSide, frac) {
    side = newSide;
    if (frac != null) { if (side === 'b') pos.x = frac; else pos.y = frac; }
    el.dataset.side = side;
    el.style.setProperty('--dk-pos', posPct());
    lset(SIDE_KEY, side);
    lset(POS_KEY, JSON.stringify({ x: +pos.x.toFixed(4), y: +pos.y.toFixed(4) }));
  }
  const center = () => { const r = pill.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  /* Drop: same edge = glide the last few pixels into place; new edge = slide in from that edge */
  function land(newSide, c) {
    const changed = newSide !== side;
    el.classList.add('no-anim');
    el.classList.remove('is-dragging');
    if (changed) el.classList.add('is-away');
    clearOff();
    place(newSide, newSide === 'b' ? Math.min(.98, Math.max(.02, c.x / innerWidth)) : Math.min(.98, Math.max(.02, c.y / innerHeight)));
    const to = center();
    if (!changed && !still()) setOff(c.x - to.x, c.y - to.y);
    void pill.offsetWidth;                                   // the start position is painted without animation...
    el.classList.remove('no-anim');
    void pill.offsetWidth;                                   // ...then everything glides to rest
    el.classList.remove('is-lifted', 'is-away');
    clearOff();
    syncBot();
  }

  /* ---- The bar itself: swipe it towards its edge to hide it, or press, hold and drag it to move it ---- */
  let drag = null, justDragged = false;
  const stopHold = () => { clearTimeout(el._holdT); el.classList.remove('is-holding'); };
  function lift() {
    if (!drag || drag.mode !== 'wait') return;
    drag.mode = 'move';
    el.classList.remove('is-holding'); el.classList.add('is-lifted');
    document.body.classList.add('dk-moving');
    try { pill.setPointerCapture(drag.id); } catch { }
    zones().classList.add('on'); buzz(14);
    clearTimeout(el._liftT); el._liftT = setTimeout(() => { if (el.classList.contains('is-lifted')) el.classList.add('is-dragging'); }, 190);
  }
  pill.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    wake();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), mode: 'wait', along: 0, zone: null };
    el.classList.add('is-holding');
    clearTimeout(el._holdT); el._holdT = setTimeout(lift, HOLD_MS);
  });
  pill.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.mode === 'move') {
      e.preventDefault();
      setOff(dx, dy);
      const z = zoneAt(e.clientX, e.clientY), Z = zones();
      ['l', 'r', 'b'].forEach(k => Z.querySelector('.dk-glow.' + k).classList.toggle('hot', (z || side) === k));
      if (z !== drag.zone) { drag.zone = z; if (z) buzz(8); }
      return;
    }
    if (drag.mode === 'none') return;
    const h = HIDE[side];
    if (drag.mode === 'wait') {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      stopHold();
      const along = h[0] ? Math.abs(dx) : Math.abs(dy), across = h[0] ? Math.abs(dy) : Math.abs(dx);
      if (across > along) { drag.mode = 'none'; return; }          // Not a swipe towards the edge: ignore it, the page is not scrolled from here
      drag.mode = 'swipe';
      try { pill.setPointerCapture(e.pointerId); } catch { }
      el.classList.add('is-dragging');
    }
    const m = dx * h[0] + dy * h[1];                                // Distance travelled towards the edge
    drag.along = m;
    const eff = m > 0 ? m : Math.max(-10, m * 0.15);                // A little give when pulled the wrong way
    setOff(h[0] * eff, h[1] * eff);
  });
  const endDrag = (e, cancel) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null; stopHold();
    clearTimeout(el._liftT);
    if (d.mode === 'move') {
      justDragged = true; setTimeout(() => { justDragged = false; }, 80);
      document.body.classList.remove('dk-moving');
      if (zonesEl) { zonesEl.classList.remove('on'); zonesEl.querySelectorAll('.dk-glow').forEach(g => g.classList.remove('hot')); }
      const c = center(), z = cancel ? '' : zoneAt(e.clientX, e.clientY);
      land(z || side, c); buzz(10); wake();
      return;
    }
    el.classList.remove('is-dragging');
    if (d.mode !== 'swipe') return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    const v = d.along / Math.max(1, performance.now() - d.t);       // px per ms
    if (d.along > 32 || v > 0.4) apply(true, true); else clearOff();
  };
  pill.addEventListener('pointerup', e => endDrag(e, false));
  pill.addEventListener('pointercancel', e => endDrag(e, true));
  pill.addEventListener('click', e => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  pill.addEventListener('contextmenu', e => e.preventDefault());

  /* ---- The edge tab: tap it, or drag it back in ---- */
  const inward = () => HIDE[side].map(v => -v);
  peek.addEventListener('click', () => { if (!justDragged) apply(false, true); });
  let pd = null;
  peek.addEventListener('pointerdown', e => { pd = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, mv: 0 }; wake(); });
  peek.addEventListener('pointermove', e => {
    if (!pd || e.pointerId !== pd.id) return;
    const dx = e.clientX - pd.x, dy = e.clientY - pd.y, n = inward();
    const mv = dx * n[0] + dy * n[1];
    if (!pd.on && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    pd.on = true;
    try { peek.setPointerCapture(e.pointerId); } catch { }
    el.classList.add('is-peeking');
    const left = Math.max(0, hideDist() - Math.max(0, mv));         // How much of the bar is still off screen
    setOff(-n[0] * left, -n[1] * left);
    pd.mv = mv;
  });
  const endPeek = () => {
    if (!pd) return;
    const d = pd; pd = null;
    el.classList.remove('is-peeking');
    if (!d.on) return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    if (d.mv > 40) apply(false, true); else clearOff();
  };
  peek.addEventListener('pointerup', endPeek);
  peek.addEventListener('pointercancel', endPeek);

  /* ---- Left or right edge: swipe in from the page to bring it back (not offered at the bottom, where it would fight with scrolling) ---- */
  const SKIP = 'input,textarea,select,[data-no-swipe],.vp,.um,.epm,.search-pop,.user-menu';
  const sidewaysScroller = n => {
    for (; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 4) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
    }
    return false;
  };
  let sw = null;
  document.addEventListener('touchstart', e => {
    if (!hidden || side === 'b' || e.touches.length !== 1) { sw = null; return; }
    const t = e.touches[0], tgt = e.target;
    if (!tgt.closest || tgt.closest(SKIP) || sidewaysScroller(tgt)) { sw = null; return; }
    sw = { x: t.clientX, y: t.clientY, t: performance.now(), on: false, dx: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sw || !hidden) return;
    const t = e.touches[0], n = inward(), dx = (t.clientX - sw.x) * n[0], dy = t.clientY - sw.y;
    if (!sw.on) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (dx <= 0 || Math.abs(dy) > Math.abs(dx) * 0.8) { sw = null; return; }
      sw.on = true;
      el.classList.add('is-peeking');
    }
    sw.dx = dx;
    setOff(-n[0] * Math.max(0, hideDist() - dx * 0.9), 0);
  }, { passive: true });
  const endSwipe = () => {
    if (!sw) return;
    const s = sw; sw = null;
    if (!s.on) return;
    el.classList.remove('is-peeking');
    const v = s.dx / Math.max(1, performance.now() - s.t);
    if (s.dx > 56 || v > 0.5) apply(false, true); else clearOff();
  };
  document.addEventListener('touchend', endSwipe, { passive: true });
  document.addEventListener('touchcancel', endSwipe, { passive: true });

  addEventListener('resize', syncBot);

  /* Back/forward cache: the page comes back as it was, so check the rule again */
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    if (isRoot) store.set(false);
    apply(!isRoot && store.get(), false);
  });

  window.AmDock = {
    show: () => apply(false, true),
    hide: () => apply(true, true),
    toggle: () => apply(!hidden, true),
    get hidden() { return hidden; },
    get side() { return side; },
    setSide: s => { if (s === 'l' || s === 'r' || s === 'b') { place(s, .5); syncBot(); } },
    reset: () => { pos.x = .5; pos.y = .5; place('l'); apply(false, true); },
  };
})();
