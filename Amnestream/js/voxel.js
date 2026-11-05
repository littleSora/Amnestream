/* Voxel theme ground: a row of grass blocks on top, stone underneath, and random ores
   (diamond, redstone, gold, silver) buried in the stone. The ores land in new places every time the page
   is refreshed; clicking around the site in the same tab keeps the same ground so it does not jump.
   Loaded by common.js only while the Voxel theme is on; AsVoxel.start() / AsVoxel.stop() */
(() => {
  if (window.AsVoxel) return;

  const BLOCK = 32;   // one block, in css px
  const TEX = 16;     // texture pixels per block side
  const PX = BLOCK / TEX;
  const ROWS = 3;     // grass row + two stone rows
  const SEED_KEY = 'as_vx_seed';

  const GRASS = ['#5fbf2a', '#54ad25', '#6ccf33', '#4a9a20'];
  const DIRT = ['#7a5535', '#6d4a2c', '#876240', '#5e3f24'];
  const STONE = ['#7d7d7d', '#7d7d7d', '#8a8a8a', '#6f6f6f', '#777777'];
  // main colour, highlight, shadow
  const ORES = {
    silver: ['#dfe3ea', '#ffffff', '#98a0ad'],
    redstone: ['#e02222', '#ff6a5c', '#8e0c0c'],
    gold: ['#f7d23a', '#fff08a', '#b8860b'],
    diamond: ['#4be8ee', '#c4fbff', '#1fa9b5'],
  };
  const ORE_ODDS = [['silver', .31], ['redstone', .28], ['gold', .23], ['diamond', .18]];
  const ORE_CHANCE = .13;   // chance that a stone block is really an ore

  const rng = (a) => () => {   // small seeded random so one seed always gives the same ground
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (r, list) => list[Math.floor(r() * list.length)];

  function getSeed() {
    let nav = '';
    try { nav = (performance.getEntriesByType('navigation')[0] || {}).type || ''; } catch { }
    let s = 0;
    try { if (nav !== 'reload') s = +sessionStorage.getItem(SEED_KEY) || 0; } catch { }
    if (!s) {
      s = (Math.random() * 4294967295) >>> 0 || 1;
      try { sessionStorage.setItem(SEED_KEY, String(s)); } catch { }
    }
    return s;
  }

  function oreKind(r) {
    let x = r();
    for (const [k, p] of ORE_ODDS) { if (x < p) return k; x -= p; }
    return 'silver';
  }

  function layout(r, cols, seen) {
    const grid = [];
    for (let y = 0; y < ROWS; y++) {
      grid.push([]);
      for (let x = 0; x < cols; x++) grid[y].push(y === 0 ? 'grass' : (r() < ORE_CHANCE ? oreKind(r) : 'stone'));
    }
    // every ore shows up at least once on the part of the ground that is on screen
    for (const k of Object.keys(ORES)) {
      if (grid.some((row) => row.slice(0, seen).includes(k))) continue;
      for (let tries = 0; tries < 40; tries++) {
        const x = Math.floor(r() * seen), y = 1 + Math.floor(r() * (ROWS - 1));
        if (grid[y][x] === 'stone') { grid[y][x] = k; break; }
      }
    }
    return grid;
  }

  function drawBlock(ctx, r, bx, by, kind) {
    const px = (tx, ty, c) => { ctx.fillStyle = c; ctx.fillRect(bx + tx * PX, by + ty * PX, PX, PX); };
    let prev = null;
    // base texture: grass blocks show a green top over dirt, everything else is stone
    for (let ty = 0; ty < TEX; ty++) {
      for (let tx = 0; tx < TEX; tx++) {
        let c;
        if (kind === 'grass') {
          if (ty < 3) c = pick(r, GRASS);
          else if (ty === 3 && r() < .45) c = pick(r, GRASS);
          else c = (prev && tx && r() < .35) ? prev : pick(r, DIRT);
        } else {
          c = (prev && tx && r() < .38) ? prev : pick(r, STONE);
        }
        px(tx, ty, c); prev = c;
      }
    }
    // ore: seven or eight chunks dropped near the middle of the block (they overlap into bigger lumps),
    // each with a bright corner and a dark corner
    if (ORES[kind]) {
      const [main, hi, lo] = ORES[kind];
      const n = 7 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const w = 2 + Math.floor(r() * 3), h = 2 + Math.floor(r() * 2);   // 2 to 4 wide, 2 to 3 tall (texture pixels)
        const x0 = 2 + Math.floor(r() * (12 - w)), y0 = 2 + Math.floor(r() * (12 - h));
        // chop one corner of bigger chunks so they are not perfect rectangles
        const cut = (w > 2 && h > 2) ? (r() < .5 ? [w - 1, 0] : [0, h - 1]) : null;
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          if (cut && xx === cut[0] && yy === cut[1]) continue;
          px(x0 + xx, y0 + yy, main);
        }
        px(x0, y0, hi); px(x0 + w - 1, y0 + h - 1, lo);
      }
    }
    // thin dark edge on the right and bottom so each block reads as its own cube
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(bx + BLOCK - PX, by, PX, BLOCK);
    ctx.fillRect(bx, by + BLOCK - PX, BLOCK, PX);
  }

  let built = null;
  function build() {
    try {
      const wide = Math.max(window.screen ? screen.width : 0, window.innerWidth || 0, 1280);
      const cols = Math.min(160, Math.ceil(wide / BLOCK) + 1);
      const seen = Math.max(4, Math.min(cols, Math.ceil((window.innerWidth || 1280) / BLOCK)));
      const r = rng(getSeed());
      const grid = layout(r, cols, seen);
      const cv = document.createElement('canvas');
      cv.width = cols * BLOCK; cv.height = ROWS * BLOCK;
      const ctx = cv.getContext('2d');
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < cols; x++) drawBlock(ctx, r, x * BLOCK, y * BLOCK, grid[y][x]);
      return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
    } catch { return null; }
  }

  function start() {
    const root = document.documentElement;
    if (root.style.getPropertyValue('--vx-ground')) return;
    if (!built) built = build();
    if (!built) return;
    root.style.setProperty('--vx-ground', 'url("' + built.url + '")');
    root.style.setProperty('--vx-w', built.w + 'px');
    root.style.setProperty('--vx-gh', built.h + 'px');
  }
  function stop() {
    const root = document.documentElement;
    ['--vx-ground', '--vx-w', '--vx-gh'].forEach((p) => root.style.removeProperty(p));
  }

  window.AsVoxel = { start, stop };
})();
