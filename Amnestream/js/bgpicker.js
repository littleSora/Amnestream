const BgPicker = (() => {
  const OUT = 1600;
  const SRC_MAX = 2400;
  const ZMAX = 4;
  const BG = '#0b0d12';
  const TYPES = /^image\/(jpeg|png|webp|gif|avif|bmp)$/i;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const note = m => typeof toast === 'function' ? toast(m) : alert(m);
  const SVG = {
    minus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    rotate: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
    upload: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  };

  let dlg, fileIn, stage, cv, g, range, pv, pvx, onDone = () => {}, raf = 0, dpr = 1, view = 'empty';
  const st = { img: null, w: 0, h: 0, rot: 0, zoom: 1, ox: 0, oy: 0, S: 0, D: 0, k: 1, mode: 'crop', bg: null };

  async function load(file) {
    let img;
    if (window.createImageBitmap) { try { img = await createImageBitmap(file); } catch { } }
    if (!img) {
      const url = URL.createObjectURL(file);
      try { img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; }); }
      finally { URL.revokeObjectURL(url); }
    }
    let w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    if (!w || !h) throw new Error('empty');
    if (Math.max(w, h) > SRC_MAX) {
      const r = SRC_MAX / Math.max(w, h), c = document.createElement('canvas');
      c.width = Math.round(w * r); c.height = Math.round(h * r);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
      if (img.close) img.close();
      img = c; w = c.width; h = c.height;
    }
    return { img, w, h };
  }
  async function useFile(file) {
    if (!file) return;
    if (!TYPES.test(file.type)) return note('Choose a JPG, PNG, WebP or GIF image');
    if (file.size > 25e6) return note('That image is over 25 MB');
    let src;
    try { src = await load(file); } catch { return note('Could not read that image'); }
    Object.assign(st, { img: src.img, w: src.w, h: src.h, rot: 0, zoom: 1, ox: 0, oy: 0, mode: 'crop' });
    setView('crop');
    makeBg(); recalc(); syncUI(); render();
  }

  /* ---------- Geometry. The picture is drawn centred on the stage (plus the pan offset), rotated, then scaled by k.
     "Crop" starts zoomed so the picture fills the square. "Fit" starts zoomed out so the whole picture is inside it,
     and the empty bands are filled with a soft blurred copy of the picture itself. ---------- */
  const dims = () => st.rot % 180 ? [st.h, st.w] : [st.w, st.h];
  function recalc() {
    if (!st.D || !st.img) return;
    const [rw, rh] = dims();
    const base = st.mode === 'fit' ? st.D / Math.max(rw, rh) : st.D / Math.min(rw, rh);
    st.k = base * st.zoom; clampPos();
  }
  function clampPos() {
    const [rw, rh] = dims(), mx = Math.max(0, (rw * st.k - st.D) / 2), my = Math.max(0, (rh * st.k - st.D) / 2);
    st.ox = clamp(st.ox, -mx, mx); st.oy = clamp(st.oy, -my, my);
  }
  function zoomAt(nz, px = 0, py = 0) {
    nz = clamp(nz, 1, ZMAX); const r = nz / st.zoom;
    st.ox = px - (px - st.ox) * r; st.oy = py - (py - st.oy) * r; st.zoom = nz;
    recalc(); syncUI(); render();
  }
  const syncRange = () => { range.value = Math.round(Math.log(st.zoom) / Math.log(ZMAX) * 100); };
  function syncUI() {
    if (!dlg) return;
    syncRange();
    dlg.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
    const seg = dlg.querySelector('.bgp-seg'); if (seg) seg.style.setProperty('--i', st.mode === 'fit' ? 0 : 1);
    dlg.querySelector('.bgp-hint').textContent = st.mode === 'fit'
      ? 'The whole picture fits in the square. Zoom in if you want to crop it after all.'
      : 'The picture fills the square. Drag to move it, scroll or use the slider to zoom.';
  }
  function layout() {
    if (!dlg || !dlg.open || view !== 'crop' || !st.img) return;
    const S = stage.clientWidth; if (!S || S === st.S) return;
    const old = st.D; st.S = S; st.D = S;
    cv.width = cv.height = Math.round(S * dpr);
    if (old) { const r = st.D / old; st.ox *= r; st.oy *= r; }
    recalc(); render();
  }

  /* A tiny copy of the picture (cover-fitted, so it is blurred when scaled up) fills the bands that "Fit" leaves */
  function makeBg() {
    const c = document.createElement('canvas'); c.width = c.height = 40;
    const x = c.getContext('2d'), [rw, rh] = dims(), k = 40 / Math.min(rw, rh);
    x.imageSmoothingQuality = 'high'; x.translate(20, 20); x.rotate(st.rot * Math.PI / 180); x.scale(k, k); x.drawImage(st.img, -st.w / 2, -st.h / 2, st.w, st.h);
    st.bg = c;
  }
  function draw(ctx, cx, cy, f) {                                                 // f = output px per stage px
    const half = st.D * f / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - half, cy - half, half * 2, half * 2); ctx.clip();
    ctx.fillStyle = BG; ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    if (st.mode === 'fit' && st.bg) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(st.bg, cx - half, cy - half, half * 2, half * 2);
      ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    }
    ctx.translate(cx + st.ox * f, cy + st.oy * f); ctx.rotate(st.rot * Math.PI / 180); ctx.scale(st.k * f, st.k * f);
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(st.img, -st.w / 2, -st.h / 2, st.w, st.h);
    ctx.restore();
  }
  function render() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); }
  function paint() {
    if (!st.img || !st.D || view !== 'crop') return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, st.S, st.S); draw(g, st.S / 2, st.S / 2, 1);
    pvx.setTransform(1, 0, 0, 1, 0, 0); draw(pvx, pv.width / 2, pv.height / 2, pv.width / st.D);
  }

  function build() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'pf-dlg avc-dlg bgp-dlg'; dlg.setAttribute('aria-label', 'Your picture');
    dlg.innerHTML = `
      <h2 data-title>Your picture</h2>
      <section class="bgp-view" data-view="empty">
        <button type="button" class="bgp-up" data-a="choose">${SVG.upload}<strong>Upload a picture</strong><span>Click to choose one, or drop it here. JPG, PNG, WebP or GIF. It stays on this device.</span></button>
      </section>
      <section class="bgp-view" data-view="manage">
        <div class="bgp-cur"><img alt="Your current picture"></div>
        <p class="bgp-note">This picture is used behind the whole site while the Your picture theme is on.</p>
        <div class="bgp-acts"><button type="button" class="btn btn-ghost" data-a="choose">Change picture</button><button type="button" class="btn btn-ghost bgp-rm" data-a="remove">Remove picture</button></div>
      </section>
      <section class="bgp-view" data-view="crop">
        <div class="avc-body bgp-body">
          <div class="avc-left">
            <div class="avc-stage bgp-stage" tabindex="0" aria-label="Crop area. Drag to move the picture. Use plus and minus to zoom, arrow keys to nudge."><canvas></canvas><div class="bgp-frame"></div></div>
            <div class="avc-zoom"><button type="button" class="avc-ib" data-z="out" aria-label="Zoom out">${SVG.minus}</button><input type="range" min="0" max="100" value="0" step="1" aria-label="Zoom"><button type="button" class="avc-ib" data-z="in" aria-label="Zoom in">${SVG.plus}</button></div>
            <div class="avc-tools">
              <div class="segc bgp-seg" style="--n:2;--i:1"><button type="button" data-m="fit">Fit all</button><button type="button" data-m="crop" class="on">Crop</button></div>
              <button type="button" class="btn-sm" data-t="rot">${SVG.rotate} Rotate</button><button type="button" class="btn-sm" data-t="reset">Reset</button>
            </div>
          </div>
          <div class="avc-right bgp-right">
            <span class="avc-lbl">Preview</span>
            <div class="bgp-pv"><canvas width="320" height="320"></canvas><div class="bgp-veil"></div>
              <div class="bgp-mock"><i class="bgp-m-nav"></i><div class="bgp-m-row"><b></b><b></b><b></b></div></div></div>
            <p class="avc-hint bgp-hint"></p>
          </div>
        </div>
      </section>
      <div class="pf-dlg-act"><button type="button" class="btn btn-ghost" data-a="cancel">Cancel</button><button type="button" class="btn btn-primary" data-a="ok" hidden>Use this picture</button></div>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp" hidden tabindex="-1">`;
    document.body.appendChild(dlg);
    fileIn = dlg.querySelector('input[type=file]');
    stage = dlg.querySelector('.bgp-stage'); cv = stage.querySelector('canvas'); g = cv.getContext('2d'); range = dlg.querySelector('input[type=range]');
    pv = dlg.querySelector('.bgp-pv canvas'); pvx = pv.getContext('2d');
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    const ptrs = new Map(); let last = 0;
    const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) last = dist(); });
    stage.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 1) { st.ox += dx; st.oy += dy; clampPos(); render(); }
      else if (ptrs.size === 2) {
        const d = dist(), [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect();
        if (last) zoomAt(st.zoom * d / last, (a.x + b.x) / 2 - r.left - st.S / 2, (a.y + b.y) / 2 - r.top - st.S / 2);
        last = d;
      }
    });
    const up = e => { ptrs.delete(e.pointerId); last = ptrs.size === 2 ? dist() : 0; };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(st.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)), e.clientX - r.left - st.S / 2, e.clientY - r.top - st.S / 2);
    }, { passive: false });
    stage.addEventListener('keydown', e => {
      const step = e.shiftKey ? 24 : 8, m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (m) { e.preventDefault(); st.ox += m[0]; st.oy += m[1]; clampPos(); render(); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(st.zoom * 1.12); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(st.zoom / 1.12); }
    });
    range.addEventListener('input', () => zoomAt(Math.pow(ZMAX, range.value / 100)));

    dlg.addEventListener('click', e => {
      const b = e.target.closest('button'), r = dlg.getBoundingClientRect();
      if (!b) { if (e.target === dlg && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dlg.close(); return; }
      if (b.dataset.z) zoomAt(st.zoom * (b.dataset.z === 'in' ? 1.15 : 1 / 1.15));
      else if (b.dataset.m) { if (st.mode !== b.dataset.m) { st.mode = b.dataset.m; st.zoom = 1; st.ox = st.oy = 0; recalc(); syncUI(); render(); } }
      else if (b.dataset.t === 'rot') { st.rot = (st.rot + 90) % 360; st.ox = st.oy = 0; makeBg(); recalc(); render(); }
      else if (b.dataset.t === 'reset') { st.rot = 0; st.zoom = 1; st.ox = st.oy = 0; st.mode = 'crop'; makeBg(); recalc(); syncUI(); render(); }
      else if (b.dataset.a === 'cancel') dlg.close();
      else if (b.dataset.a === 'choose') fileIn.click();
      else if (b.dataset.a === 'remove') { Photo.clear(); dlg.close(); onDone('remove'); }
      else if (b.dataset.a === 'ok') confirm_();
    });
    fileIn.addEventListener('change', () => { const f = fileIn.files[0]; fileIn.value = ''; useFile(f); });
    dlg.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); dlg.classList.add('over'); } });
    dlg.addEventListener('dragleave', e => { if (!e.relatedTarget || !dlg.contains(e.relatedTarget)) dlg.classList.remove('over'); });
    dlg.addEventListener('drop', e => { e.preventDefault(); dlg.classList.remove('over'); useFile(e.dataTransfer.files[0]); });
    dlg.addEventListener('close', () => { st.img = null; st.bg = null; });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(stage); else addEventListener('resize', layout);
  }

  function setView(v) {
    view = v;
    dlg.querySelectorAll('.bgp-view').forEach(s => { s.hidden = s.dataset.view !== v; });
    dlg.querySelector('[data-title]').textContent = v === 'crop' ? 'Crop your picture' : 'Your picture';
    const ok = dlg.querySelector('[data-a=ok]');
    ok.hidden = v === 'empty';
    ok.textContent = 'Use this picture';
    dlg.classList.toggle('is-crop', v === 'crop');
    if (v === 'crop') { st.S = 0; requestAnimationFrame(() => { layout(); stage.focus({ preventScroll: true }); }); }
  }

  async function confirm_() {
    if (view === 'manage') { dlg.close(); onDone('use'); return; }
    const c = document.createElement('canvas'); c.width = c.height = OUT;
    draw(c.getContext('2d'), OUT / 2, OUT / 2, OUT / st.D);
    const ok = dlg.querySelector('[data-a=ok]'); ok.disabled = true;
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', .88));
    try {
      if (!blob) throw new Error('Could not use that picture.');
      await Photo.save(new File([blob], 'background.jpg', { type: 'image/jpeg' }));
    } catch (e) { ok.disabled = false; note(e.message || 'Could not use that picture.'); return; }
    ok.disabled = false; dlg.close(); onDone('use');
  }

  /* Opens the pop-up. With a file (dropped on the tile) it goes straight to cropping */
  function open(opts = {}) {
    build(); onDone = opts.onDone || (() => {});
    const pic = Photo.get();
    if (pic) { dlg.querySelector('.bgp-cur img').src = pic; setView('manage'); }
    else setView('empty');
    if (!dlg.open) dlg.showModal();
    if (opts.file) useFile(opts.file);
  }
  return { open };
})();
