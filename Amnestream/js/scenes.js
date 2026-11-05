/* Animated backgrounds for the Galaxy, Vaporwave, Sakura and Aurora themes: one fixed canvas behind the page.
   Loaded on demand by common.js while one of those themes is on; AsScene.start(name) / AsScene.stop() */
(() => {
  if (window.AsScene) return;

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const EPOCH = 1.7e12;
  const now = () => (Date.now() - EPOCH) / 1000;

  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const reseed = n => { seed = n; };

  let cv, ctx, W = 0, H = 0, dpr = 1, raf = 0, on = false, still = false, name = '', scene = null, lastFrame = 0;

  /* A smooth wandering value in 0..1 built from a few sines (cheap stand-in for noise) */
  const wob = (x, t, k = 0) => .5 + .5 * (Math.sin(x * 1.7 + t * .9 + k) * .5 + Math.sin(x * 3.1 - t * .6 + k * 2.3) * .3 + Math.sin(x * .7 + t * .35 + k * .7) * .2);

  function galaxy() {
    reseed(11);
    const stars = [];
    const makeStars = () => {
      stars.length = 0;
      const n = Math.round(clamp(W * H / 3800, 160, 520));
      for (let i = 0; i < n; i++) stars.push({ x: rnd(), y: rnd(), z: .25 + rnd() * .75, tw: rnd() * TAU, sp: .6 + rnd() * 1.6, hue: rnd() });
    };
    let band, bctx, bw = 0, bh = 0, shoots = [], nextShoot = 3;
    const cloudCount = 46;
    const clouds = [];
    for (let i = 0; i < cloudCount; i++) clouds.push({ u: rnd(), v: (rnd() - .5) * 2, r: .08 + rnd() * .16, hue: rnd(), ph: rnd() * TAU, sp: .02 + rnd() * .05 });

    function resize() {
      makeStars();
      bw = Math.max(240, Math.round(W / 4)); bh = Math.max(160, Math.round(H / 4));
      band = document.createElement('canvas'); band.width = bw; band.height = bh; bctx = band.getContext('2d');
    }

    function paintBand(t) {
      bctx.clearRect(0, 0, bw, bh);
      bctx.globalCompositeOperation = 'lighter';
      const ang = -.52 + Math.sin(t * .02) * .05;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const L = Math.hypot(bw, bh);
      for (const c of clouds) {
        const u = ((c.u + t * c.sp * .12) % 1 + 1) % 1;
        const along = (u - .5) * L * 1.25;
        const across = c.v * bh * (.12 + .1 * Math.sin(u * 6 + c.ph)) + Math.sin(t * .15 + c.ph) * bh * .02;
        const x = bw * .5 + along * ca - across * sa;
        const y = bh * .5 + along * sa + across * ca;
        const r = c.r * L * (.8 + .25 * Math.sin(t * .3 + c.ph));
        const g = bctx.createRadialGradient(x, y, 0, x, y, r);
        const warm = c.hue < .35, cool = c.hue > .7;
        const col = warm ? [255, 190, 150] : cool ? [150, 170, 255] : [210, 160, 255];
        const edge = Math.abs(along) / (L * .62);
        const a = (warm ? .3 : .23) * clamp(1.2 - edge, 0, 1);
        g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
        g.addColorStop(.45, `rgba(${col[0]},${col[1]},${col[2]},${a * .45})`);
        g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        bctx.fillStyle = g; bctx.beginPath(); bctx.arc(x, y, r, 0, TAU); bctx.fill();
      }
      const cx = bw * .5 + Math.sin(t * .05) * bw * .04, cy = bh * .5;
      const core = bctx.createRadialGradient(cx, cy, 0, cx, cy, L * .2);
      core.addColorStop(0, 'rgba(255,236,210,.5)'); core.addColorStop(.5, 'rgba(255,200,170,.18)'); core.addColorStop(1, 'rgba(255,200,170,0)');
      bctx.fillStyle = core; bctx.fillRect(0, 0, bw, bh);
      bctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * bh * .11 + Math.sin(t * .1 + i * 2) * bh * .03;
        bctx.save(); bctx.translate(bw * .5, bh * .5 + off * ca); bctx.rotate(ang + Math.sin(t * .07 + i) * .04);
        const lg = bctx.createLinearGradient(0, -bh * .05, 0, bh * .05);
        lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(.5, 'rgba(0,0,0,.16)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        bctx.fillStyle = lg; bctx.fillRect(-L, -bh * .05, L * 2, bh * .1); bctx.restore();
      }
      bctx.globalCompositeOperation = 'source-over';
    }

    function frame(t, dt) {
      const g = ctx.createRadialGradient(W * .5, H * .4, 0, W * .5, H * .4, Math.max(W, H) * .8);
      g.addColorStop(0, '#0b0a1f'); g.addColorStop(.6, '#05040f'); g.addColorStop(1, '#010108');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      paintBand(t);
      ctx.globalAlpha = .95; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(band, 0, 0, W, H); ctx.globalAlpha = 1;
      for (const s of stars) {
        const x = ((s.x + t * .004 * s.z) % 1) * W, y = ((s.y + t * .0016 * s.z) % 1) * H;
        const tw = .6 + .4 * Math.sin(t * s.sp + s.tw);
        const r = (.35 + s.z * 1.15) * (dpr > 1.4 ? 1.2 : 1);
        ctx.fillStyle = s.hue < .15 ? `rgba(255,210,170,${tw * s.z})` : s.hue > .85 ? `rgba(170,200,255,${tw * s.z})` : `rgba(255,255,255,${tw * s.z})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (s.z > .92 && tw > .85) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - 5, y - .3, 10, .6); ctx.fillRect(x - .3, y - 5, .6, 10); }
      }
      nextShoot -= dt;
      if (nextShoot <= 0 && !still) { nextShoot = 4 + rnd() * 7; shoots.push({ x: rnd() * W * .8, y: rnd() * H * .4, vx: 520 + rnd() * 260, vy: 200 + rnd() * 120, life: 0 }); }
      shoots = shoots.filter(s => s.life < 1);
      for (const s of shoots) {
        s.life += dt * 1.3; s.x += s.vx * dt; s.y += s.vy * dt;
        const a = Math.sin(clamp(s.life, 0, 1) * Math.PI), tl = .09;
        const gr = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tl, s.y - s.vy * tl);
        gr.addColorStop(0, `rgba(255,255,255,${a * .9})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * tl, s.y - s.vy * tl); ctx.stroke();
      }
      const v = ctx.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, 'rgba(1,1,8,.1)'); v.addColorStop(1, 'rgba(1,1,8,.28)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    return { resize, frame };
  }

  function vapor() {
    reseed(23);
    const stars = []; let shapes = [];
    function resize() {
      stars.length = 0;
      for (let i = 0; i < 70; i++) stars.push({ x: rnd(), y: rnd() * .5, r: .4 + rnd() * 1.1, tw: rnd() * TAU });
      shapes = [];
      for (let i = 0; i < 7; i++) shapes.push({ x: rnd(), y: .1 + rnd() * .35, s: 14 + rnd() * 26, k: i % 3, sp: .15 + rnd() * .3, ph: rnd() * TAU, col: i % 2 ? '1,205,254' : '255,113,206' });
    }
    function frame(t) {
      const hor = H * .62;
      const sky = ctx.createLinearGradient(0, 0, 0, hor);
      sky.addColorStop(0, '#0e0224'); sky.addColorStop(.55, '#3a0a63'); sky.addColorStop(1, '#c0187f');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hor + 1);
      for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${.35 + .45 * Math.sin(t * 1.2 + s.tw)})`; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, TAU); ctx.fill(); }
      const sr = Math.min(W, H) * .2, sx = W * .5, sy = hor - sr * .55 + Math.sin(t * .5) * 4;
      const glow = ctx.createRadialGradient(sx, sy, sr * .6, sx, sy, sr * 2.2);
      glow.addColorStop(0, 'rgba(255,90,160,.42)'); glow.addColorStop(1, 'rgba(255,90,160,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - sr * 2.3, sy - sr * 2.3, sr * 4.6, sr * 4.6);
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.clip();
      const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
      sg.addColorStop(0, '#fff36e'); sg.addColorStop(.5, '#ff7a9c'); sg.addColorStop(1, '#ff2d95');
      ctx.fillStyle = sg; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      ctx.fillStyle = '#3a0a63';
      const period = sr * .2, shift = (t * 9) % period;
      for (let y = sy - sr * .1 + shift; y < sy + sr; y += period) { const k = (y - (sy - sr * .1)) / (sr * 1.1); ctx.fillRect(sx - sr, y, sr * 2, 1 + k * period * .55); }
      ctx.restore();
      for (const s of shapes) {
        const x = s.x * W + Math.sin(t * s.sp + s.ph) * 26, y = s.y * H + Math.cos(t * s.sp * .8 + s.ph) * 18;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * s.sp * .6 + s.ph); ctx.strokeStyle = `rgba(${s.col},.55)`; ctx.lineWidth = 1.6; ctx.beginPath();
        if (s.k === 0) { ctx.moveTo(0, -s.s); ctx.lineTo(s.s * .9, s.s * .7); ctx.lineTo(-s.s * .9, s.s * .7); ctx.closePath(); }
        else if (s.k === 1) ctx.rect(-s.s * .6, -s.s * .6, s.s * 1.2, s.s * 1.2);
        else { ctx.moveTo(0, -s.s); ctx.lineTo(s.s, 0); ctx.lineTo(0, s.s); ctx.lineTo(-s.s, 0); ctx.closePath(); }
        ctx.stroke(); ctx.restore();
      }
      const gr = ctx.createLinearGradient(0, hor, 0, H);
      gr.addColorStop(0, '#2a0650'); gr.addColorStop(1, '#0d0220');
      ctx.fillStyle = gr; ctx.fillRect(0, hor, W, H - hor);
      ctx.strokeStyle = 'rgba(1,205,254,.65)'; ctx.lineWidth = 1.4;
      const vx = W * .5;
      ctx.save(); ctx.beginPath(); ctx.rect(0, hor, W, H - hor); ctx.clip();
      for (let i = -24; i <= 24; i++) { ctx.beginPath(); ctx.moveTo(vx + i * 14, hor); ctx.lineTo(vx + i * W * .11, H); ctx.stroke(); }
      const speed = .35, rows = 14, ph = (t * speed) % 1;
      for (let i = 0; i < rows; i++) {
        const k = (i + ph) / rows, y = hor + (H - hor) * Math.pow(k, 2.2);
        ctx.globalAlpha = clamp(k * 1.6, .1, 1); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.restore();
      const hz = ctx.createLinearGradient(0, hor - 14, 0, hor + 24);
      hz.addColorStop(0, 'rgba(255,113,206,0)'); hz.addColorStop(.4, 'rgba(255,113,206,.55)'); hz.addColorStop(1, 'rgba(255,113,206,0)');
      ctx.fillStyle = hz; ctx.fillRect(0, hor - 14, W, 38);
      const v = ctx.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(10,0,24,.35)'); v.addColorStop(1, 'rgba(10,0,24,.5)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    return { resize, frame };
  }

  /* Sakura: a pale page with a cherry-blossom branch coming in from the right, vertical lettering on the left and petals drifting down.
     The branch is painted once into an offscreen layer; each frame only sways that layer a hair and moves the petals. */
  function sakura() {
    reseed(5);
    const SIZE = 740;                                   // the branch is designed on a 740 x 740 board
    const INK = '#2a1b22', ROSE = '#ec5b86';
    const BRANCHES = [
      [[800, 184], [716, 205], [668, 226], [626, 252], [584, 278], [552, 306], [528, 342], [512, 380], [496, 418], [470, 452], [436, 480], [400, 492], [352, 494], [300, 492], [250, 498], [205, 508]],
      [[724, 196], [704, 184], [672, 170], [640, 160], [604, 150], [570, 140], [540, 125], [520, 108]],
      [[590, 282], [560, 286], [528, 296], [494, 300], [458, 296], [420, 290], [384, 288], [345, 282], [300, 268]],
      [[506, 390], [472, 396], [440, 396], [404, 392], [372, 396], [340, 408], [300, 418]],
      [[440, 470], [410, 450], [370, 444], [330, 446], [290, 446], [250, 452], [210, 458], [180, 462]],
      [[250, 498], [224, 520], [196, 552], [170, 580], [142, 600], [120, 612]],
      [[440, 480], [452, 505], [468, 530], [478, 556], [470, 578]],
      [[668, 226], [662, 262], [656, 302], [654, 342], [646, 380], [630, 420], [612, 462], [600, 492]],
      [[656, 302], [676, 312], [696, 326], [712, 350], [716, 380]],
    ];
    const WIDTH = [[15, 5], [6, 2], [5, 1.5], [4, 1.5], [3.5, 1.2], [3, 1], [5, 1.5], [4, 1.2], [2.5, 1]];
    /* x, y, radius, tilt (1 = facing us), depth (0 pale .. 1 deep pink) */
    const FLOWERS = [
      [640, 148, 30, .9, .5], [608, 132, 27, .8, .4], [676, 172, 22, .7, .6], [522, 112, 17, .8, .5],
      [366, 285, 38, .95, .3], [430, 262, 38, .85, .5], [476, 284, 34, .9, .2], [495, 314, 28, .7, .6], [534, 270, 26, .8, .4], [404, 302, 22, .75, .7], [300, 268, 22, .8, .4], [590, 272, 22, .9, .5],
      [410, 390, 32, .85, .4], [352, 410, 26, .7, .5], [446, 388, 22, .9, .3],
      [485, 502, 46, .98, .15], [440, 468, 28, .8, .45], [518, 548, 30, .85, .5], [472, 572, 24, .7, .6], [536, 436, 24, .75, .7],
      [640, 420, 32, .9, .35], [676, 396, 24, .8, .6], [612, 468, 26, .85, .3], [690, 312, 22, .85, .5], [668, 300, 20, .8, .35], [712, 372, 17, .8, .5],
      [105, 526, 40, .92, .3], [160, 497, 30, .85, .45], [140, 552, 26, .75, .6], [122, 470, 24, .8, .5], [76, 556, 22, .8, .4], [196, 522, 22, .8, .6],
      [322, 512, 34, .85, .3], [354, 490, 30, .8, .5], [286, 522, 24, .75, .6],
    ];
    const BUDS = [[578, 176], [556, 94], [520, 104], [270, 262], [328, 238], [308, 294], [398, 326], [566, 254], [381, 442], [268, 424], [440, 598], [620, 374], [694, 350], [596, 536],
      [60, 526], [222, 574], [242, 578], [150, 600], [350, 520], [566, 560]];
    let layer, petals = [], ax = 0, ay = 0, U = 1, ox = 0, oy = 0, tx = 0, ty = 0, textOn = false;
    const COLS = ['250,176,200', '246,150,184', '253,208,224', '240,126,168', '255,226,236'];
    const make = fresh => ({
      x: W * .3 + rnd() * (W * .8), y: fresh ? rnd() * H : -20 - rnd() * 120, z: .4 + rnd() * .9, rot: rnd() * TAU, vr: (rnd() - .5) * 1.6,
      sw: rnd() * TAU, sa: 18 + rnd() * 44, col: COLS[(rnd() * COLS.length) | 0], fl: rnd() * TAU,
    });

    /* Catmull-Rom through the control points, drawn as short tapering strokes */
    function limb(c, pts, w0, w1) {
      const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
      for (let i = 1; i < P.length - 2; i++) {
        for (let k = 0; k < 8; k++) {
          const t = k / 8, t2 = t * t, t3 = t2 * t;
          out.push([0, 1].map(d => .5 * ((2 * P[i][d]) + (-P[i - 1][d] + P[i + 1][d]) * t + (2 * P[i - 1][d] - 5 * P[i][d] + 4 * P[i + 1][d] - P[i + 2][d]) * t2 + (-P[i - 1][d] + 3 * P[i][d] - 3 * P[i + 1][d] + P[i + 2][d]) * t3)));
        }
      }
      out.push(pts[pts.length - 1]);
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [col, f, dx] of [['#33262a', 1, 0], ['rgba(120,92,96,.55)', .32, -.18]]) {
        for (let i = 0; i < out.length - 1; i++) {
          const w = lerp(w0, w1, i / (out.length - 1)) * f * U;
          c.strokeStyle = col; c.lineWidth = Math.max(.6, w);
          c.beginPath(); c.moveTo(ox + out[i][0] * U + dx * w0 * U * .3, oy + out[i][1] * U); c.lineTo(ox + out[i + 1][0] * U + dx * w0 * U * .3, oy + out[i + 1][1] * U); c.stroke();
        }
      }
      return out;
    }

    function petal(c, r, depth) {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `hsl(338 ${60 + depth * 25}% ${52 - depth * 8}%)`);
      g.addColorStop(.2, `hsl(339 ${68 + depth * 15}% ${72 - depth * 7}%)`);
      g.addColorStop(.55, `hsl(341 ${70 + depth * 12}% ${86 - depth * 7}%)`);
      g.addColorStop(1, `hsl(342 80% ${96 - depth * 4}%)`);
      c.beginPath(); c.moveTo(0, 0);
      c.bezierCurveTo(-r * .62, -r * .2, -r * .84, -r * .8, -r * .27, -r * .99);
      c.quadraticCurveTo(0, -r * .8, r * .27, -r * .99);
      c.bezierCurveTo(r * .84, -r * .8, r * .62, -r * .2, 0, 0);
      c.closePath();
      c.fillStyle = g; c.fill();
      c.strokeStyle = 'rgba(214,96,138,.38)'; c.lineWidth = .7; c.stroke();
      c.strokeStyle = 'rgba(200,60,110,.28)'; c.lineWidth = .6;
      for (const a of [-.22, 0, .22]) { c.beginPath(); c.moveTo(0, -r * .1); c.quadraticCurveTo(a * r * .4, -r * .5, a * r * .75, -r * .82); c.stroke(); }
    }

    function flower(c, x, y, r, tilt, depth) {
      c.save(); c.translate(ox + x * U, oy + y * U); c.rotate(rnd() * TAU); c.scale(1, tilt);
      r *= U;
      const off = rnd() * TAU;
      c.shadowColor = 'rgba(150,50,90,.2)'; c.shadowBlur = r * .14; c.shadowOffsetY = r * .05;
      for (let i = 0; i < 5; i++) {
        c.save(); c.rotate(off + i * TAU / 5 + (rnd() - .5) * .18); const k = .92 + rnd() * .14; petal(c, r * k, depth); c.restore();
      }
      c.shadowColor = 'transparent';
      for (let i = 0; i < 13; i++) {
        const a = rnd() * TAU, l = r * (.2 + rnd() * .2);
        c.strokeStyle = 'rgba(150,25,70,.75)'; c.lineWidth = Math.max(.5, r * .018);
        c.beginPath(); c.moveTo(Math.cos(a) * r * .05, Math.sin(a) * r * .05); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke();
        c.fillStyle = '#7a1040'; c.beginPath(); c.arc(Math.cos(a) * l, Math.sin(a) * l, Math.max(.7, r * .028), 0, TAU); c.fill();
      }
      const cg = c.createRadialGradient(0, 0, 0, 0, 0, r * .16);
      cg.addColorStop(0, '#6e0c38'); cg.addColorStop(1, 'rgba(194,24,91,.85)');
      c.fillStyle = cg; c.beginPath(); c.arc(0, 0, r * .15, 0, TAU); c.fill();
      c.restore();
    }

    function bud(c, x, y, ang) {
      const s = U * 10 * (.8 + rnd() * .5);
      c.save(); c.translate(ox + x * U, oy + y * U); c.rotate(ang);
      c.strokeStyle = '#4a3036'; c.lineWidth = Math.max(.8, U * 1.3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, s * .9); c.stroke();
      const g = c.createRadialGradient(-s * .25, -s * .1, 0, 0, 0, s * 1.1);
      g.addColorStop(0, '#f27aa5'); g.addColorStop(.6, '#d6336c'); g.addColorStop(1, '#a3174f');
      c.shadowColor = 'rgba(120,20,60,.25)'; c.shadowBlur = s * .3;
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, s * .78, s * .95, 0, 0, TAU); c.fill();
      c.shadowColor = 'transparent';
      c.fillStyle = '#7a1840'; c.beginPath(); c.ellipse(0, s * .72, s * .38, s * .22, 0, 0, TAU); c.fill();
      c.restore();
    }

    function paintLayer() {
      const c = layer.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      reseed(21);
      const samples = [];
      BRANCHES.forEach((b, i) => { const s = limb(c, b, WIDTH[i][0], WIDTH[i][1]); for (const p of s) samples.push(p); });
      const near = (x, y) => { let best = null, bd = 1e9; for (const p of samples) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = p; } } return best; };
      c.strokeStyle = '#3a2a2e'; c.lineCap = 'round';
      for (const [x, y, r] of FLOWERS) { const p = near(x, y); c.lineWidth = Math.max(.8, U * 1.5); c.beginPath(); c.moveTo(ox + p[0] * U, oy + p[1] * U); c.lineTo(ox + x * U, oy + y * U); c.stroke(); }
      for (const [x, y] of BUDS) { const p = near(x, y); bud(c, x, y, Math.atan2(y - p[1], x - p[0]) - Math.PI / 2 + Math.PI); }
      [...FLOWERS].sort((a, b) => a[2] - b[2]).forEach(f => flower(c, ...f));
    }

    function placeText() {
      let el = document.getElementById('as-scene-text');
      if (!el) {
        el = document.createElement('div'); el.id = 'as-scene-text'; el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<span class="st-jp" lang="ja">アムネストリーム</span><span class="st-en">AMNESTREAM</span>';
        cv.after(el);
        if (!document.getElementById('as-scene-font')) {
          const l = document.createElement('link'); l.id = 'as-scene-font'; l.rel = 'stylesheet';
          l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400&family=Jost:wght@300;400&text=' + encodeURIComponent('アムネストリームAMNESTREAM') + '&display=swap';
          document.head.appendChild(l);
        }
      }
      textOn = true;
    }

    function resize() {
      U = Math.min(H / SIZE, Math.max(W / 700, .55)) * 1.02;
      ox = W - SIZE * U + 8 * U; oy = (H - SIZE * U) / 2; ax = W; ay = H * .26;
      if (!layer) layer = document.createElement('canvas');
      layer.width = Math.round(W * dpr); layer.height = Math.round(H * dpr);
      paintLayer();
      const n = Math.round(clamp(W / 26, 24, 64));
      petals = []; for (let i = 0; i < n; i++) petals.push(make(true));
      if (!textOn) placeText();
    }
    function petalPath(s) {
      ctx.beginPath(); ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * .95, -s * .55, s * .7, s * .75, 0, s);
      ctx.bezierCurveTo(-s * .7, s * .75, -s * .95, -s * .55, 0, -s);
      ctx.moveTo(-s * .12, -s); ctx.lineTo(0, -s * .72); ctx.lineTo(s * .12, -s);
    }
    function frame(t, dt) {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(.7, '#fffafb'); bg.addColorStop(1, '#fff1f5');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(Math.sin(t * .45) * .0035 + Math.sin(t * .17) * .002); ctx.translate(-ax, -ay);
      ctx.drawImage(layer, 0, 0, W, H);
      ctx.restore();
      const wind = 24 + Math.sin(t * .22) * 18;
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += (30 + p.z * 40) * dt; p.x += (-wind * p.z * .6 + Math.sin(t * .8 + p.sw) * p.sa * .35) * dt; p.rot += p.vr * dt;
        if (p.y > H + 30 || p.x < -60) petals[i] = make(false);
        const s = 5 + p.z * 7, flip = Math.cos(t * 1.4 + p.fl);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(.35 + Math.abs(flip) * .65, 1);
        ctx.globalAlpha = .6 + p.z * .35; ctx.fillStyle = `rgba(${p.col},1)`; petalPath(s); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    return { resize, frame, dispose() { const el = document.getElementById('as-scene-text'); if (el) el.remove(); } };
  }

  function aurora() {
    reseed(31);
    const stars = []; let low, lctx, lw = 0, lh = 0;
    function resize() {
      stars.length = 0;
      for (let i = 0; i < 160; i++) stars.push({ x: rnd(), y: rnd() * .8, r: .3 + rnd() * .9, tw: rnd() * TAU, sp: .5 + rnd() * 1.5 });
      lw = Math.max(240, Math.round(W / 4)); lh = Math.max(150, Math.round(H / 4));
      low = document.createElement('canvas'); low.width = lw; low.height = lh; lctx = low.getContext('2d');
    }
    const CURTAINS = [
      { y: .08, h: .36, col: [60, 255, 170], a: .44, k: 0, sp: .22, w: 1.1 },
      { y: .04, h: .32, col: [40, 210, 255], a: .30, k: 2, sp: .17, w: .9 },
      { y: .12, h: .38, col: [150, 100, 255], a: .32, k: 4, sp: .13, w: 1.3 },
      { y: .02, h: .28, col: [120, 255, 200], a: .22, k: 6, sp: .27, w: .7 },
    ];
    function curtains(t) {
      lctx.clearRect(0, 0, lw, lh); lctx.globalCompositeOperation = 'lighter';
      for (const c of CURTAINS) {
        const cols = 52, dx = lw / cols;
        for (let i = 0; i <= cols; i++) {
          const x = i * dx, u = i / cols * 3 * c.w;
          const top = lh * (c.y + (wob(u * 1.6, t * c.sp, c.k) - .5) * .22 + Math.sin(u * 2.2 + t * c.sp * 1.4 + c.k) * .035);
          const ht = lh * c.h * (.55 + .75 * wob(u * 2.4, t * c.sp * 1.3, c.k + 1));
          const ray = .55 + .45 * wob(u * 11, t * c.sp * 2.1, c.k + 3);
          const g = lctx.createLinearGradient(0, top, 0, top + ht);
          const [r, gr, b] = c.col;
          g.addColorStop(0, `rgba(${r},${gr},${b},0)`); g.addColorStop(.18, `rgba(${r},${gr},${b},${c.a * ray})`);
          g.addColorStop(.55, `rgba(${r},${gr},${b},${c.a * .35 * ray})`); g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
          lctx.fillStyle = g; lctx.fillRect(x, top, dx + 1.2, ht);
        }
      }
      lctx.globalCompositeOperation = 'source-over';
    }
    function frame(t) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#02060f'); sky.addColorStop(.6, '#051325'); sky.addColorStop(1, '#0a2a2f');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.sin(t * s.sp + s.tw)})`; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, TAU); ctx.fill(); }
      curtains(t);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(low, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .22; ctx.drawImage(low, -W * .01, -H * .01, W * 1.02, H * 1.02); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const rg = ctx.createLinearGradient(0, H * .7, 0, H); rg.addColorStop(0, 'rgba(60,255,180,0)'); rg.addColorStop(1, 'rgba(60,255,180,.10)');
      ctx.fillStyle = rg; ctx.fillRect(0, H * .7, W, H * .3);
      ctx.fillStyle = '#020910'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let i = 0; i <= 40; i++) { const x = i / 40 * W; ctx.lineTo(x, H * (.93 - .05 * wob(i * .55, 0, 9) - .018 * Math.sin(i * .9))); }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      const v = ctx.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(2,6,15,.32)'); v.addColorStop(1, 'rgba(2,6,15,.4)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    return { resize, frame };
  }

  const SCENES = { galaxy, vapor, sakura, aurora };

  function resize() {
    if (!cv) return;
    dpr = Math.min(window.devicePixelRatio || 1, name === 'galaxy' || name === 'aurora' ? 1.25 : 1.5);
    W = Math.max(1, Math.round(innerWidth)); H = Math.max(1, Math.round(innerHeight));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scene) { scene.resize(); if (still) draw(); }
  }

  function draw() {
    const t = now(), dt = clamp(t - lastFrame, 0, .1) || .016;
    lastFrame = t;
    if (scene) scene.frame(t, dt);
  }

  function loop() {
    if (!on || still) return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (on && !still && !raf) { lastFrame = now(); raf = requestAnimationFrame(loop); } };

  function mount() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.id = 'as-scene'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:-2;pointer-events:none';
    document.body.prepend(cv);
    ctx = cv.getContext('2d');
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
  }

  function unmount() {
    cancelAnimationFrame(raf); raf = 0;
    removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
    if (scene && scene.dispose) scene.dispose();
    if (cv) cv.remove();
    cv = ctx = null; scene = null; name = '';
  }

  function start(n) {
    if (!SCENES[n]) { stop(); return; }
    if (!document.body) { document.addEventListener('DOMContentLoaded', () => start(n), { once: true }); return; }
    if (cv && name === n && on) return;
    if (cv && name !== n) unmount();
    on = true; name = n;
    mount();
    scene = SCENES[n]();
    const reduce = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    still = reduce;
    resize();
    cancelAnimationFrame(raf); raf = 0;
    lastFrame = now();
    if (still) draw(); else raf = requestAnimationFrame(loop);
  }
  function stop() { on = false; unmount(); }

  window.AsScene = { start, stop };
})();
