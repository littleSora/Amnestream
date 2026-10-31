/* Profile photo picker.
   AvatarPicker.html(id, value, name) returns a drop zone. Drop (or choose) a photo, crop it inside a circle with a live preview, confirm,
   and the result (a small square JPEG, as a data: URL) is put in the hidden input #id, so the existing "Save changes" code reads it like before.
   Everything is delegated from the document, so the zone keeps working after the page redraws itself. */
const AvatarPicker = (() => {
  const OUT = 256;               // Saved size in px. The site shows avatars up to ~132px, so this stays sharp on high-DPI screens
  const SRC_MAX = 1600;          // Big photos are shrunk once on load so panning and zooming stay smooth
  const ZMAX = 5;                // Most you can zoom in (times the "just covers the circle" size)
  const BG = '#20242d';          // Shows through transparent PNGs
  const TYPES = /^image\/(jpeg|png|webp|gif|avif|bmp)$/i;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const note = m => typeof toast === 'function' ? toast(m) : alert(m);
  const initial = n => esc((n || 'G')[0].toUpperCase());
  const avImg = (v, name, size) => v
    ? `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(v)}" alt="">`
    : `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px">${initial(name)}</span>`;
  const SVG = {
    minus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    rotate: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
    upload: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  };

  /* ---------- The drop zone (markup used by the settings page and the edit-profile pop-up) ---------- */
  function html(id, value = '', name = 'G') {
    return `<div class="set-lbl">Profile photo
      <div class="avdz ${value ? 'has' : ''}" tabindex="0" role="button" data-name="${esc(name)}" aria-label="Change profile photo. Drop an image here, or press Enter to choose one.">
        <span class="avdz-prev">${avImg(value, name, 56)}</span>
        <span class="avdz-txt">
          <strong><span class="avdz-d">Drag and drop a photo here</span><span class="avdz-t">Tap to choose a photo</span></strong>
          <span class="avdz-sub"><span class="avdz-d">or click to browse. </span>JPG, PNG, WebP or GIF.</span>
          <span class="avdz-note">New photo ready. Press Save changes to keep it.</span>
        </span>
        <span class="avdz-ic" aria-hidden="true">${SVG.upload}</span>
        <button type="button" class="btn-sm avdz-rm" data-av-clear>Remove</button>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp" hidden tabindex="-1">
        <input type="hidden" id="${esc(id)}" value="${esc(value)}">
      </div></div>`;
  }
  const field = z => z.querySelector('input[type=hidden]');
  function refresh(z, changed) {
    const v = field(z).value, name = z.dataset.name;
    z.querySelector('.avdz-prev').innerHTML = avImg(v, name, 56);
    z.classList.toggle('has', !!v);
    if (changed) z.classList.add('changed');
    const big = z.closest('.set-col')?.parentElement?.querySelector(':scope > .acct-av');   // The large picture beside the settings form
    if (big) big.innerHTML = avImg(v, name, 78);
  }
  function setValue(z, v) {
    const f = field(z); f.value = v; f.dispatchEvent(new Event('input', { bubbles: true }));
    refresh(z, true);
  }

  /* ---------- Reading the photo ---------- */
  async function load(file) {
    let img;
    if (window.createImageBitmap) { try { img = await createImageBitmap(file); } catch { /* fall back to <img> */ } }
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
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
      if (img.close) img.close();
      img = c; w = c.width; h = c.height;
    }
    return { img, w, h };
  }
  async function openFile(file, z) {
    if (!file) return;
    if (!TYPES.test(file.type)) return note('Choose a JPG, PNG, WebP or GIF image');
    if (file.size > 25e6) return note('That image is over 25 MB');
    let src;
    try { src = await load(file); } catch { return note('Could not read that image'); }
    zone = z; openCrop(src);
  }

  /* ---------- The crop pop-up ---------- */
  let zone = null, dlg, stage, cv, g, range, previews = [], dpr = 1, raf = 0;
  const st = { img: null, w: 0, h: 0, rot: 0, zoom: 1, ox: 0, oy: 0, S: 0, D: 0, k: 1, kmin: 1 };

  function build() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'pf-dlg avc-dlg'; dlg.setAttribute('aria-label', 'Crop profile photo');
    dlg.innerHTML = `
      <h2>Crop your photo</h2>
      <div class="avc-body">
        <div class="avc-left">
          <div class="avc-stage" tabindex="0" aria-label="Crop area. Drag to move the photo. Use plus and minus to zoom, arrow keys to nudge."><canvas></canvas><div class="avc-mask"></div><div class="avc-ring"></div></div>
          <div class="avc-zoom"><button type="button" class="avc-ib" data-z="out" aria-label="Zoom out">${SVG.minus}</button><input type="range" min="0" max="100" value="0" step="1" aria-label="Zoom"><button type="button" class="avc-ib" data-z="in" aria-label="Zoom in">${SVG.plus}</button></div>
          <div class="avc-tools"><button type="button" class="btn-sm" data-t="rot">${SVG.rotate} Rotate</button><button type="button" class="btn-sm" data-t="reset">Reset</button></div>
        </div>
        <div class="avc-right">
          <span class="avc-lbl">Preview</span>
          <div class="avc-pv"><canvas data-s="112"></canvas><canvas data-s="56"></canvas><canvas data-s="32"></canvas></div>
          <p class="avc-hint">Drag the photo to move it. Scroll, pinch or use the slider to zoom.</p>
        </div>
      </div>
      <div class="pf-dlg-act"><button type="button" class="btn btn-ghost" data-t="cancel">Cancel</button><button type="button" class="btn btn-primary" data-t="ok">Use this photo</button></div>`;
    document.body.appendChild(dlg);
    stage = dlg.querySelector('.avc-stage'); cv = stage.querySelector('canvas'); g = cv.getContext('2d'); range = dlg.querySelector('input[type=range]');
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    previews = [...dlg.querySelectorAll('.avc-pv canvas')].map(c => { const size = +c.dataset.s; c.width = c.height = Math.round(size * dpr); c.style.width = c.style.height = size + 'px'; return { c, size, x: c.getContext('2d') }; });

    /* Moving and pinching */
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
      else if (b.dataset.t === 'rot') { st.rot = (st.rot + 90) % 360; st.ox = st.oy = 0; recalc(); render(); }
      else if (b.dataset.t === 'reset') { st.rot = 0; st.zoom = 1; st.ox = st.oy = 0; recalc(); syncRange(); render(); }
      else if (b.dataset.t === 'cancel') dlg.close();
      else if (b.dataset.t === 'ok') confirmCrop();
    });
    dlg.addEventListener('close', () => { st.img = null; });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(stage); else addEventListener('resize', layout);
  }

  /* Geometry. The photo is drawn with its centre at (stage centre + ox,oy), rotated, then scaled by k. The crop is the square that holds the circle (D px wide). */
  const dims = () => st.rot % 180 ? [st.h, st.w] : [st.w, st.h];
  function recalc() {
    if (!st.D) return;
    const [rw, rh] = dims();
    st.kmin = st.D / Math.min(rw, rh); st.k = st.kmin * st.zoom; clampPos();
  }
  function clampPos() {
    const [rw, rh] = dims(), mx = Math.max(0, (rw * st.k - st.D) / 2), my = Math.max(0, (rh * st.k - st.D) / 2);
    st.ox = clamp(st.ox, -mx, mx); st.oy = clamp(st.oy, -my, my);
  }
  function zoomAt(nz, px = 0, py = 0) {                                           // Zoom keeping the point under (px,py) where it is
    nz = clamp(nz, 1, ZMAX); const r = nz / st.zoom;
    st.ox = px - (px - st.ox) * r; st.oy = py - (py - st.oy) * r; st.zoom = nz;
    recalc(); syncRange(); render();
  }
  const syncRange = () => { range.value = Math.round(Math.log(st.zoom) / Math.log(ZMAX) * 100); };
  function layout() {
    if (!dlg || !dlg.open || !st.img) return;
    const S = stage.clientWidth; if (!S || S === st.S) return;
    const old = st.D; st.S = S; st.D = Math.round(S - Math.max(24, S * .1));
    cv.width = cv.height = Math.round(S * dpr);
    stage.style.setProperty('--d', st.D + 'px');
    if (old) { const r = st.D / old; st.ox *= r; st.oy *= r; }
    recalc(); render();
  }
  function draw(ctx, cx, cy, f) {                                                 // f = output px per stage px
    ctx.save(); ctx.translate(cx + st.ox * f, cy + st.oy * f); ctx.rotate(st.rot * Math.PI / 180); ctx.scale(st.k * f, st.k * f);
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(st.img, -st.w / 2, -st.h / 2, st.w, st.h); ctx.restore();
  }
  function render() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); }
  function paint() {
    if (!st.img || !st.D) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, st.S, st.S); draw(g, st.S / 2, st.S / 2, 1);
    previews.forEach(({ x, size }) => { x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = BG; x.fillRect(0, 0, size, size); draw(x, size / 2, size / 2, size / st.D); });
  }
  function openCrop(src) {
    build();
    Object.assign(st, { img: src.img, w: src.w, h: src.h, rot: 0, zoom: 1, ox: 0, oy: 0, S: 0, D: 0 });
    range.value = 0;
    if (!dlg.open) dlg.showModal();
    layout(); stage.focus({ preventScroll: true });
  }
  function confirmCrop() {
    const c = document.createElement('canvas'); c.width = c.height = OUT;
    const x = c.getContext('2d'); x.fillStyle = BG; x.fillRect(0, 0, OUT, OUT);
    draw(x, OUT / 2, OUT / 2, OUT / st.D);
    const url = c.toDataURL('image/jpeg', .86), z = zone;
    dlg.close();
    if (z && z.isConnected) { setValue(z, url); z.focus({ preventScroll: true }); }
    else note('Photo ready, but the form was closed');
  }

  /* ---------- Events on the drop zone ---------- */
  const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  document.addEventListener('click', e => {
    if (e.target.matches('.avdz input[type=file]')) return;                       // Our own programmatic click
    const z = e.target.closest('.avdz'); if (!z) return;
    if (e.target.closest('[data-av-clear]')) { e.preventDefault(); setValue(z, ''); return; }
    z.querySelector('input[type=file]').click();
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('avdz')) { e.preventDefault(); e.target.querySelector('input[type=file]').click(); }
  });
  document.addEventListener('change', e => {
    if (!e.target.matches('.avdz input[type=file]')) return;
    const f = e.target.files[0], z = e.target.closest('.avdz'); e.target.value = '';
    openFile(f, z);
  });
  let overEl = null;
  const clearOver = () => { if (overEl) overEl.classList.remove('over'); overEl = null; };
  document.addEventListener('dragover', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();                                                           // Also stops the browser opening a file dropped outside the zone
    const z = e.target.closest?.('.avdz');
    e.dataTransfer.dropEffect = z ? 'copy' : 'none';
    if (z !== overEl) { clearOver(); if (z) { z.classList.add('over'); overEl = z; } }
  });
  document.addEventListener('dragleave', e => { if (overEl && !e.relatedTarget) clearOver(); });
  document.addEventListener('drop', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const z = e.target.closest?.('.avdz'); clearOver();
    if (z) openFile(e.dataTransfer.files[0], z);
  });

  return { html };
})();
