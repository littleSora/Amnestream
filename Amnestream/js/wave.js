/* Wave theme: a calm, glowing sea drawn on one fixed canvas behind the page.
   Three silky layers of swell, light caught under each crest, a few glints; ripples follow the pointer and swell with scrolling.
   When the theme is first picked, glowing streams pour in from the top, splash into the rising water and ripple it.
   Time comes from the wall clock, so changing page carries the sea on instead of restarting it.
   Loaded on demand by common.js while the Wave theme is on; AsWave.start() / AsWave.stop() */
(() => {
  if (window.AsWave) return;

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const EPOCH = 1.7e12;
  const now = () => (Date.now() - EPOCH) / 1000;

  const LAYERS = [
    { base: .64, top: [0, 229, 255, .40], mid: [10, 110, 220, .24], bot: [10, 20, 100, .10], dir: 1, sharp: 1.25,
      w: [[1300, .034, .48, 0], [560, .012, .85, 2.1]], line: [160, 246, 255, .55], rim: .20 },
    { base: .73, top: [255, 45, 149, .38], mid: [170, 35, 190, .20], bot: [50, 12, 110, .09], dir: -1, sharp: 1.3,
      w: [[1100, .032, .56, 1.3], [480, .012, .95, 3.4]], line: [255, 165, 222, .48], rim: .20 },
    { base: .83, top: [225, 252, 255, .28], mid: [50, 200, 240, .20], bot: [0, 100, 180, .10], dir: 1, sharp: 1.35,
      w: [[900, .030, .72, 2.4], [400, .011, 1.15, .9]], line: [255, 255, 255, .72], rim: .22 },
  ];
  const rgba = (c, a = c[3]) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const STREAMS = [[.09, 15, .05], [.27, 11, .32], [.50, 22, 0], [.72, 12, .42], [.90, 17, .2]];
  const POUR_END = 7.2;

  let cv, ctx, W = 0, H = 0, dpr = 1, raf = 0, on = false, still = false, pourOn = false;
  let rippleList = [], spray = [], glints = [], streams = [];
  let energy = 0, lastScroll = 0, lastRipple = 0, lastPx = -999, lastT = 0;

  /* Seconds since this theme was picked (the pour and the fill-up only play for the first seconds, never on page changes) */
  function since() {
    let t0 = 0; try { t0 = +localStorage.getItem('as_theme_t0') || 0; } catch { }
    return t0 ? Math.max(0, (Date.now() - t0) / 1000) : 99;
  }
  const loadedAt = Date.now(), since0 = since();
  const sinceNow = () => since0 + (Date.now() - loadedAt) / 1000;

  /* The water rises from below the screen once the pour is under way */
  function rise() {
    const p = clamp((sinceNow() - 1.2) / 4.4, 0, 1);
    return 1 - Math.pow(1 - p, 3);
  }

  /* Ripples: from the pointer, from clicks, and from the pour landing */
  function addRipple(x, a, t) {
    rippleList.push({ x, t0: t, a });
    if (rippleList.length > 16) rippleList.shift();
  }
  function ripple(x, a) {
    const t = now();
    if (t - lastRipple < .09) return;
    lastRipple = t;
    addRipple(x, a, t);
  }
  function rippleAt(x, t) {
    let d = 0;
    for (const r of rippleList) {
      const age = t - r.t0, dist = Math.abs(x - r.x), front = age * 340, e = dist - front;
      if (age > 4.2 || Math.abs(e) > 230) continue;
      d += r.a * Math.exp(-(e * e) / (2 * 48 * 48)) * Math.cos(e * .045) * Math.exp(-age * .85);
    }
    return d;
  }

  /* Height of one layer's surface at x (px from top). Crests are lifted a little sharper than troughs */
  function surface(L, x, t, rz, amp) {
    let y = 0;
    for (const [len, a, sp, ph] of L.w) {
      const s = Math.sin(x / len * TAU + t * sp * L.dir + ph + Math.sin(t * .21 + ph) * .7);
      y += (s > 0 ? Math.pow(s, L.sharp) : -Math.pow(-s, .82)) * a * H * amp;
    }
    y += Math.sin(x / 1900 * TAU + t * .14 + L.base * 9) * H * .012 * amp;
    return H * L.base + (1 - rz) * H * .52 - y + rippleAt(x, t) * (.5 + L.base * .6);
  }

  function seed() {
    glints = Array.from({ length: clamp(Math.round(W / 260), 4, 8) }, () => ({ x: Math.random() * W, sp: .6 + Math.random() * 1.2, ph: Math.random() * TAU }));
    streams = STREAMS.map(([f, w, d], i) => ({ x: f * W, w, d, ph: i * 1.7, landed: false, acc: 0, rip: 0 }));
    pourOn = !still && since0 < POUR_END;
  }

  function resize() {
    if (!cv) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (still) frame();
  }

  function path(L, t, rz, amp) {
    ctx.beginPath();
    ctx.moveTo(-4, H + 4);
    for (let x = -4; x <= W + 8; x += 6) ctx.lineTo(x, surface(L, x, t, rz, amp));
    ctx.lineTo(W + 8, H + 4);
    ctx.closePath();
  }

  function splash(x, y, n, power) {
    for (let i = 0; i < n && spray.length < 90; i++)
      spray.push({ x: x + (Math.random() - .5) * 10, y, vx: (Math.random() - .5) * 150 * power, vy: -(70 + Math.random() * 170) * power, r: .9 + Math.random() * 2, life: 1 });
  }

  /* The pour: smooth glowing streams that fall from the top edge, land in the water, then thin out and let go */
  function drawPour(t, dt, rz, amp) {
    const ts = sinceNow();
    if (ts > POUR_END) { pourOn = false; return; }
    const G = H * 1.7;
    for (const s of streams) {
      const age = ts - s.d;
      if (age <= 0) continue;
      const water = surface(LAYERS[0], s.x, t, rz, amp), land = Math.min(H, water) + 5, flowing = water < H - 6;
      const head = Math.min(land, .5 * G * age * age);
      const endAge = ts - (4.4 + s.d * .6);
      const tail = endAge > 0 ? Math.min(land, .5 * G * .5 * endAge * endAge) : 0;
      if (tail >= land - 1) continue;
      const grow = clamp(age * 2.4, 0, 1) * (endAge > 0 ? clamp(1 - endAge * .7, .3, 1) : 1);
      const hw0 = s.w * .5 * grow;

      const cx = [], hw = [], ys = [];
      for (let y = tail; ; y += 10) {
        const yy = Math.min(y, head);
        const toHead = head - yy, fromTail = yy - tail;
        const w = hw0 * (1 + .14 * Math.sin(yy * .035 - t * 9 + s.ph)) * (toHead < 16 && head < land - 1 ? .4 + .6 * (toHead / 16) : 1) * (fromTail < 36 && tail > 0 ? .3 + .7 * (fromTail / 36) : 1);
        cx.push(s.x + Math.sin(yy * .010 - t * 4.5 + s.ph) * (1.5 + yy / H * 5)); hw.push(w); ys.push(yy);
        if (y >= head) break;
      }
      const trace = k => {
        ctx.beginPath();
        ctx.moveTo(cx[0] - hw[0] * k, ys[0]);
        for (let i = 1; i < ys.length; i++) ctx.lineTo(cx[i] - hw[i] * k, ys[i]);
        for (let i = ys.length - 1; i >= 0; i--) ctx.lineTo(cx[i] + hw[i] * k, ys[i]);
        ctx.closePath();
      };
      const pad = hw0 * 2.6 + 14;
      ctx.save();
      trace(2.3); ctx.fillStyle = 'rgba(90,215,255,.10)'; ctx.fill();
      const g = ctx.createLinearGradient(s.x - pad, 0, s.x + pad, 0);
      g.addColorStop(.12, 'rgba(70,205,245,0)'); g.addColorStop(.3, 'rgba(110,225,252,.55)'); g.addColorStop(.5, 'rgba(235,253,255,.88)');
      g.addColorStop(.7, 'rgba(110,225,252,.55)'); g.addColorStop(.88, 'rgba(70,205,245,0)');
      trace(1); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx[0], ys[0]); for (let i = 1; i < ys.length; i++) ctx.lineTo(cx[i], ys[i]);
      ctx.setLineDash([22, 46]); ctx.lineDashOffset = -t * 520; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, hw0 * .28); ctx.stroke();
      ctx.restore();

      const lip = ctx.createRadialGradient(s.x, 0, 0, s.x, 0, hw0 * 3 + 12);
      lip.addColorStop(0, `rgba(190,245,255,${.5 * grow})`); lip.addColorStop(1, 'rgba(190,245,255,0)');
      ctx.fillStyle = lip; ctx.fillRect(s.x - hw0 * 3 - 12, 0, hw0 * 6 + 24, hw0 * 3 + 12);

      if (head >= land - .5 && flowing) {
        const R = 22 + hw0 * 2.2;
        const im = ctx.createRadialGradient(s.x, land - 4, 0, s.x, land - 4, R);
        im.addColorStop(0, `rgba(255,255,255,${.4 * grow})`); im.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = im; ctx.beginPath(); ctx.arc(s.x, land - 4, R, 0, TAU); ctx.fill();
        if (!s.landed) { s.landed = true; splash(s.x, land - 4, 16, 1.25); addRipple(s.x, 30, t); }
        s.acc += dt; s.rip += dt;
        if (s.acc > .07) { s.acc = 0; splash(s.x, land - 4, 2, .8); }
        if (s.rip > .22) { s.rip = 0; addRipple(s.x, 7 + 4 * grow, t); }
      }
    }
  }

  function drawSpray(dt) {
    ctx.save();
    for (let i = spray.length - 1; i >= 0; i--) {
      const s = spray[i];
      s.vy += 300 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.1;
      if (s.life <= 0 || s.y > H) { spray.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(235,252,255,${.75 * s.life})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawGlints(L, t, rz, amp) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of glints) {
      const k = Math.pow(Math.max(0, Math.sin(t * g.sp + g.ph)), 8);
      if (k < .03) continue;
      const x = (g.x + t * 6 * L.dir + W * 4) % W, y = surface(L, x, t, rz, amp) + 1, s = 5 + 8 * k;
      ctx.strokeStyle = `rgba(255,255,255,${.8 * k})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s * .7); ctx.lineTo(x, y + s * .7); ctx.stroke();
      const rg = ctx.createRadialGradient(x, y, 0, x, y, s * 1.6);
      rg.addColorStop(0, `rgba(255,255,255,${.32 * k})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, s * 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function frame() {
    const t = now(), dt = clamp(t - lastT, 0, .06); lastT = t;
    const rz = still ? 1 : rise(), amp = (1 + energy * .55) * (0.6 + .4 * rz);
    energy *= .965;
    ctx.clearRect(0, 0, W, H);

    if (pourOn) drawPour(t, dt, rz, amp);

    LAYERS.forEach((L, i) => {
      const yTop = H * L.base + (1 - rz) * H * .52 - H * .04;
      const g = ctx.createLinearGradient(0, yTop, 0, H);
      g.addColorStop(0, rgba(L.top)); g.addColorStop(.35, rgba(L.mid)); g.addColorStop(1, rgba(L.bot));
      path(L, t, rz, amp); ctx.fillStyle = g; ctx.fill();
      const rim = ctx.createLinearGradient(0, yTop, 0, yTop + H * .2);
      rim.addColorStop(0, `rgba(255,255,255,${L.rim * rz})`); rim.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rim; ctx.fill();

      ctx.beginPath();
      for (let x = -4; x <= W + 8; x += 6) { const y = surface(L, x, t, rz, amp); x === -4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba(L.line, L.line[3] * .3); ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = rgba(L.line); ctx.lineWidth = 1.4; ctx.stroke();

      if (i === 2) drawGlints(L, t, rz, amp);
    });
    drawSpray(dt);
  }

  function loop() {
    if (!on) return;
    frame();
    raf = requestAnimationFrame(loop);
  }

  const onMove = e => {
    if (e.clientY < H * .5) return;
    if (Math.abs(e.clientX - lastPx) < 46) return;
    ripple(e.clientX, clamp(Math.abs(e.clientX - lastPx) * .35, 6, 22)); lastPx = e.clientX;
  };
  const onDown = e => { if (e.clientY > H * .45) ripple(e.clientX, 34); };
  const onScroll = () => { const y = scrollY, d = Math.abs(y - lastScroll); lastScroll = y; energy = Math.min(1.6, energy + d * .0016); };
  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (on && !still && !raf) raf = requestAnimationFrame(loop); };

  function mount() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.id = 'as-wave'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:-2;pointer-events:none';
    document.body.prepend(cv);
    ctx = cv.getContext('2d');
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    lastScroll = scrollY; lastT = now();
  }

  function unmount() {
    cancelAnimationFrame(raf); raf = 0;
    removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onDown);
    removeEventListener('scroll', onScroll);
    if (cv) cv.remove();
    cv = ctx = null; rippleList = []; spray = [];
  }

  function start() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', start, { once: true }); return; }
    on = true;
    mount();
    const reduce = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    still = reduce;
    resize();
    cancelAnimationFrame(raf); raf = 0;
    if (still) frame(); else raf = requestAnimationFrame(loop);
  }
  function stop() { on = false; unmount(); }

  window.AsWave = { start, stop };
})();
