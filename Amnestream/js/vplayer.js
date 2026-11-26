/* Amnestream player.
   A custom player around <video>: capsule controls, gestures, a caption engine of its own (WebVTT, SRT and ASS) with working track switching,
   quality (HLS levels or several files), speed, caption style and sync, skip intro / outro, picture-in-picture, fullscreen and media keys.

   const vp = VPlayer.create(hostElement, { onEnded, onError, onReady, onProgress, onNext, onPrev, hasNext, hasPrev });
   vp.load({ sources, subtitles, intro, outro, title, poster }, { startAt, autoplay, subsOff });
   vp.setMeta({ title, sub });  vp.pause();  vp.toggle();  vp.destroy();  */
(function () {
  'use strict';

  const HLS_URLS = [
    'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.17/hls.min.js',
  ];
  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const CC_DEFAULT = { size: 1, bg: 'shadow', color: '#ffffff', high: false };

  /* ---------- small helpers ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { } },
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = t => {
    if (!isFinite(t) || t < 0) t = 0;
    t = Math.floor(t);
    const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const I = {
    play: '<path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.4-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none"/>',
    prev: '<path d="M18 6.2v11.6a.8.8 0 0 1-1.25.66L8.4 12.66a.8.8 0 0 1 0-1.32l8.35-5.8A.8.8 0 0 1 18 6.2z" fill="currentColor" stroke="none"/><path d="M5.5 6v12"/>',
    next: '<path d="M6 6.2v11.6a.8.8 0 0 0 1.25.66l8.35-5.8a.8.8 0 0 0 0-1.32l-8.35-5.8A.8.8 0 0 0 6 6.2z" fill="currentColor" stroke="none"/><path d="M18.5 6v12"/>',
    vol: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z" fill="currentColor" stroke="none"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8"/>',
    mute: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    cc: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10.4 10.3a2.3 2.3 0 1 0 0 3.4M16.4 10.3a2.3 2.3 0 1 0 0 3.4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2.8"/><rect x="12" y="11" width="6.5" height="5" rx="1.2" fill="currentColor" stroke="none"/>',
    fs: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15"/>',
    fsx: '<path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M15 4v3.5A1.5 1.5 0 0 0 16.5 9H20M9 20v-3.5A1.5 1.5 0 0 0 7.5 15H4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    skip: '<path d="M5 5.5v13l9-6.5z" fill="currentColor" stroke="none"/><path d="M18 5.5v13"/>',
    replay: '<path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2L3.5 8.5M3.5 3.5v5h5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4h.01"/>',
    fwd: '<path d="M6 7l5 5-5 5M12.5 7l5 5-5 5"/>',
    rew: '<path d="M18 7l-5 5 5 5M11.5 7l-5 5 5 5"/>',
    rw10: '<path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2L3.5 8.5M3.5 3.5v5h5"/><text x="12" y="15.3" text-anchor="middle" font-size="7.4" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif">10</text>',
    ff10: '<path d="M20.5 12a8.5 8.5 0 1 1-2.7-6.2L20.5 8.5M20.5 3.5v5h-5"/><text x="12" y="15.3" text-anchor="middle" font-size="7.4" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif">10</text>',
  };
  const ico = (n, s = 22) => `<svg class="vp-i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- HLS (loaded only when a stream needs it) ---------- */
  let hlsLoad = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoad) return hlsLoad;
    hlsLoad = new Promise((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (i >= HLS_URLS.length) { hlsLoad = null; reject(new Error('Could not load the HLS library')); return; }
        const s = document.createElement('script');
        s.src = HLS_URLS[i++]; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = () => window.Hls ? resolve(window.Hls) : next();
        s.onerror = () => { s.remove(); next(); };
        document.head.appendChild(s);
      };
      next();
    });
    return hlsLoad;
  }

  /* ---------- Captions: parsing ---------- */
  const toSec = str => {
    const m = /^(?:(\d+):)?(\d+):(\d+)(?:[.,](\d+))?$/.exec(String(str).trim());
    if (!m) return NaN;
    return (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +('0.' + m[4]) : 0);
  };
  function parseCueText(blocks) {                                 // WebVTT and SRT
    const cues = [];
    for (const b of blocks) {
      const lines = b.split('\n'), i = lines.findIndex(l => l.includes('-->'));
      if (i < 0) continue;
      const m = /^\s*([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(lines[i]);
      if (!m) continue;
      const body = lines.slice(i + 1).join('\n').trim();
      const s = toSec(m[1]), e = toSec(m[2]);
      if (body && isFinite(s) && isFinite(e) && e > s) cues.push({ s, e, t: body });
    }
    return cues;
  }
  function parseASS(text) {
    const cues = [], seen = new Set();
    let inEvents = false, fmtCols = null;
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (/^\[events\]/i.test(line)) { inEvents = true; continue; }
      if (/^\[.+\]/.test(line)) { inEvents = false; continue; }
      if (!inEvents) continue;
      if (/^format:/i.test(line)) { fmtCols = line.slice(7).split(',').map(x => x.trim().toLowerCase()); continue; }
      if (!/^dialogue:/i.test(line) || !fmtCols) continue;
      const n = fmtCols.length, body = line.slice(9).trimStart(), parts = [];
      let rest = body;
      for (let k = 0; k < n - 1; k++) { const c = rest.indexOf(','); if (c < 0) break; parts.push(rest.slice(0, c)); rest = rest.slice(c + 1); }
      parts.push(rest);
      const get = k => parts[fmtCols.indexOf(k)] || '';
      let t = get('text');
      if (/\\p[1-9]/.test(t)) continue;                              // vector drawings, not words
      t = t.replace(/\{\\i1\}/g, '<i>').replace(/\{\\i0\}/g, '</i>')
        .replace(/\{\\b1\}/g, '<b>').replace(/\{\\b0\}/g, '</b>')
        .replace(/\{[^}]*\}/g, '').replace(/\\N/g, '\n').replace(/\\n/g, '\n').replace(/\\h/g, ' ').trim();
      const s = toSec(get('start')), e = toSec(get('end'));
      const key = s + '|' + e + '|' + t;
      if (!t || !isFinite(s) || !isFinite(e) || e <= s || seen.has(key)) continue;
      seen.add(key); cues.push({ s, e, t });
    }
    return cues;
  }
  function parseSubtitles(text, formatHint, url) {
    text = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const f = String(formatHint || '').toLowerCase();
    const isAss = f === 'ass' || f === 'ssa' || /\.(ass|ssa)(\?|#|$)/i.test(url || '') || /^\[script info\]/im.test(text);
    const cues = isAss ? parseASS(text) : parseCueText(text.split(/\n{2,}/));
    cues.sort((a, b) => a.s - b.s || a.e - b.e);
    return cues;
  }
  /* Cue text to safe HTML: everything is escaped first, then only <i>, <b>, <u> come back */
  function cueHTML(t) {
    return esc(t.replace(/<\d+:\d+(?::\d+)?[.,]\d+>/g, '').replace(/<\/?(?:c|v|lang|ruby|rt)[^>]*>/g, ''))
      .replace(/&lt;(\/?)(i|b|u)&gt;/gi, '<$1$2>').replace(/\n/g, '<br>');
  }

  /* ---------- The player ---------- */
  function create(host, opts) {
    opts = opts || {};
    const root = document.createElement('div');
    root.className = 'vp is-paused is-idle controls-on';
    root.tabIndex = 0;
    root.setAttribute('data-no-swipe', '');
    root.setAttribute('aria-label', 'Video player');
    root.innerHTML = `
      <video class="vp-video" playsinline webkit-playsinline preload="metadata"></video>
      <div class="vp-cc" aria-hidden="true"></div>
      <div class="vp-shade vp-shade-t"></div><div class="vp-shade vp-shade-b"></div>
      <div class="vp-top">
        <div class="vp-ttl"><b></b><span></span></div>
        <span class="vp-sp"></span>
        <div class="vp-chip vp-tools">
          <button class="vp-b vp-ccb" type="button" aria-label="Subtitles" aria-haspopup="true">${ico('cc')}<u></u></button>
          <button class="vp-b vp-set" type="button" aria-label="Settings" aria-haspopup="true">${ico('gear', 21)}</button>
          <div class="vp-volbox">
            <button class="vp-b vp-mute" type="button" aria-label="Mute">${ico('vol')}</button>
            <div class="vp-vol" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100"><i></i></div>
          </div>
          <button class="vp-b vp-pip" type="button" aria-label="Picture in picture">${ico('pip', 21)}</button>
        </div>
      </div>
      <div class="vp-tap vp-tap-l"><span>${ico('rew', 30)}<b>10</b></span></div>
      <div class="vp-tap vp-tap-r"><span>${ico('fwd', 30)}<b>10</b></span></div>
      <div class="vp-fast">${ico('fwd', 16)} 2x speed</div>
      <div class="vp-mid">
        <button class="vp-b vp-rw" type="button" aria-label="Back 10 seconds">${ico('rw10', 30)}</button>
        <button class="vp-b vp-play" type="button" aria-label="Play">${ico('play')}</button>
        <button class="vp-b vp-ff" type="button" aria-label="Forward 10 seconds">${ico('ff10', 30)}</button>
      </div>
      <div class="vp-spin" aria-hidden="true"></div>
      <button class="vp-skip" type="button" hidden>${ico('skip', 16)}<span>Skip intro</span></button>
      <div class="vp-bar">
        <div class="vp-btns">
          <div class="vp-chip vp-time"><span class="vp-t vp-cur">0:00</span><i>/</i><span class="vp-t vp-dur">0:00</span></div>
          <span class="vp-sp"></span>
          <div class="vp-chip vp-nav">
            <button class="vp-b vp-prev" type="button" aria-label="Previous episode" hidden>${ico('prev', 20)}</button>
            <button class="vp-b vp-next" type="button" aria-label="Next episode" hidden>${ico('next', 20)}</button>
            <button class="vp-b vp-fs" type="button" aria-label="Fullscreen">${ico('fs', 21)}</button>
          </div>
        </div>
        <div class="vp-seekrow">
          <div class="vp-seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="vp-track"><i class="vp-buf"></i><i class="vp-played"></i><span class="vp-marks"></span></div>
            <b class="vp-thumb"></b>
            <em class="vp-tip">0:00</em>
          </div>
        </div>
      </div>
      <div class="vp-menu" role="menu" hidden></div>
      <div class="vp-note" role="status" aria-live="polite"></div>`;
    host.appendChild(root);

    const q = s => root.querySelector(s);
    const video = q('.vp-video'), ccBox = q('.vp-cc');
    const els = {
      play: q('.vp-play'), rw: q('.vp-rw'), ff: q('.vp-ff'), prev: q('.vp-prev'), next: q('.vp-next'), mute: q('.vp-mute'), vol: q('.vp-vol'),
      ccb: q('.vp-ccb'), set: q('.vp-set'), pip: q('.vp-pip'), fs: q('.vp-fs'), seek: q('.vp-seek'), played: q('.vp-played'),
      buf: q('.vp-buf'), thumb: q('.vp-thumb'), tip: q('.vp-tip'), cur: q('.vp-cur'), dur: q('.vp-dur'), marks: q('.vp-marks'),
      menu: q('.vp-menu'), skip: q('.vp-skip'), note: q('.vp-note'), ttl: q('.vp-ttl b'), sub: q('.vp-ttl span'),
      fast: q('.vp-fast'), tapL: q('.vp-tap-l'), tapR: q('.vp-tap-r'), bar: q('.vp-bar'),
    };

    /* ---- state ---- */
    const S = {
      destroyed: false, media: null, srcIdx: 0, hls: null, levels: [], level: -1,
      tracks: [], trackKey: 'off', cues: [], cueCache: new Map(), delay: 0, lastCueKey: '',
      intro: null, outro: null, seeking: false, raf: 0, hideT: 0, noteT: 0, menuPage: null,
      ccStyle: { ...CC_DEFAULT }, loadSeq: 0, srcSeq: 0, startAt: 0, ready: false, rateBeforeHold: 1,
    };
    try { Object.assign(S.ccStyle, JSON.parse(store.get('as_vp_cc', '{}'))); } catch { }
    video.volume = clamp(parseFloat(store.get('as_vp_vol', '1')), 0, 1) || 1;
    video.muted = store.get('as_vp_muted', '0') === '1';

    const isTouch = () => matchMedia('(hover:none)').matches;
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
    const cleanups = [];

    /* ---- UI sync ---- */
    function setPlayIcon() {
      const p = video.paused || video.ended;
      root.classList.toggle('is-paused', p);
      els.play.innerHTML = ico(video.ended ? 'replay' : p ? 'play' : 'pause');
      els.play.setAttribute('aria-label', p ? 'Play' : 'Pause');
    }
    function paintTime() {
      const d = video.duration, t = video.currentTime;
      const pct = d > 0 ? t / d * 100 : 0;
      els.played.style.width = pct + '%';
      els.thumb.style.left = pct + '%';
      els.cur.textContent = fmt(t);
      els.dur.textContent = d > 0 && isFinite(d) ? fmt(d) : '--:--';
      els.seek.setAttribute('aria-valuenow', String(Math.round(pct)));
      els.seek.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(d));
    }
    function paintBuffer() {
      const d = video.duration; if (!(d > 0)) return;
      let end = 0; const b = video.buffered;
      for (let i = 0; i < b.length; i++) if (b.start(i) <= video.currentTime + 0.3) end = Math.max(end, b.end(i));
      els.buf.style.width = clamp(end / d * 100, 0, 100) + '%';
    }
    function paintMarks() {
      const d = video.duration; els.marks.innerHTML = '';
      if (!(d > 0)) return;
      [['intro', S.intro], ['outro', S.outro]].forEach(([k, r]) => {
        if (!r) return;
        const i = document.createElement('i'); i.className = 'vp-mark ' + k;
        i.style.left = clamp(r.start / d * 100, 0, 100) + '%';
        i.style.width = clamp((Math.min(r.end, d) - r.start) / d * 100, 0, 100) + '%';
        els.marks.appendChild(i);
      });
    }
    function paintVolume() {
      const v = video.muted ? 0 : video.volume;
      els.vol.firstElementChild.style.width = v * 100 + '%';
      els.vol.setAttribute('aria-valuenow', String(Math.round(v * 100)));
      els.mute.innerHTML = ico(v === 0 ? 'mute' : 'vol');
      els.mute.setAttribute('aria-label', v === 0 ? 'Unmute' : 'Mute');
    }
    function paintSkip() {
      const t = video.currentTime, d = video.duration;
      let kind = null;
      if (S.intro && t >= S.intro.start - 0.2 && t < S.intro.end - 1) kind = 'intro';
      else if (S.outro && t >= S.outro.start - 0.2 && t < Math.min(S.outro.end, d || 1e9) - 1) kind = 'outro';
      if (kind === 'outro' && opts.hasNext && !opts.hasNext()) kind = null;
      els.skip.hidden = !kind;
      els.skip.dataset.kind = kind || '';
      if (kind) els.skip.lastElementChild.textContent = kind === 'intro' ? 'Skip intro' : 'Next episode';
    }
    function paintCC() {
      const off = S.trackKey === 'off';
      els.ccb.classList.toggle('on', !off);
      els.ccb.querySelector('u').textContent = off ? '' : (S.tracks.find(t => t.key === S.trackKey) || {}).short || '';
      els.ccb.hidden = !S.tracks.length;
    }
    function paintNav() {
      els.prev.hidden = !(opts.hasPrev && opts.hasPrev());
      els.next.hidden = !(opts.hasNext && opts.hasNext());
    }
    function applyCCStyle() {
      const c = S.ccStyle;
      root.style.setProperty('--cc-scale', c.size);
      root.style.setProperty('--cc-fg', c.color);
      root.dataset.ccbg = c.bg;
      root.classList.toggle('cc-high', !!c.high);
    }

    /* ---- Captions engine ---- */
    function drawCaptions(force) {
      if (!S.cues.length || S.trackKey === 'off') { if (S.lastCueKey !== '') { ccBox.innerHTML = ''; S.lastCueKey = ''; } return; }
      const t = video.currentTime - S.delay, cues = S.cues;
      let lo = 0, hi = cues.length - 1, idx = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (cues[mid].s <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
      const act = [];
      for (let i = idx; i >= 0 && cues[i].s > t - 40 && act.length < 4; i--) if (cues[i].e > t) act.unshift(i);
      const key = S.trackKey + ':' + act.join(',');
      if (!force && key === S.lastCueKey) return;
      S.lastCueKey = key;
      ccBox.innerHTML = act.map(i => `<div class="vp-line"><span>${cueHTML(cues[i].t)}</span></div>`).join('');
    }
    async function loadCues(track) {
      if (S.cueCache.has(track.url)) return S.cueCache.get(track.url);
      const res = await fetch(track.url, { credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const cues = parseSubtitles(await res.text(), track.format, track.url);
      if (!cues.length) throw new Error('empty');
      S.cueCache.set(track.url, cues);
      return cues;
    }
    async function selectTrack(key, remember) {
      if (S.destroyed) return;
      const seq = ++S.loadSeq;
      if (key === 'off' || !key) {
        S.trackKey = 'off'; S.cues = []; S.lastCueKey = '#'; drawCaptions(true);
        if (remember) store.set('as_vp_sub', 'off');
        paintCC(); paintMenu(); return;
      }
      const tr = S.tracks.find(t => t.key === key); if (!tr) return;
      note('Loading ' + tr.label + '...', 0);
      try {
        const cues = await loadCues(tr);
        if (seq !== S.loadSeq || S.destroyed) return;
        S.trackKey = key; S.cues = cues; S.lastCueKey = '#';
        drawCaptions(true);
        if (remember) store.set('as_vp_sub', tr.lang || tr.label.toLowerCase());
        note(tr.label, 1400);
      } catch {
        if (seq !== S.loadSeq) return;
        note('Could not load ' + tr.label, 2600);
      }
      paintCC(); paintMenu();
    }
    function pickInitial(tracks, subsOff) {
      if (!tracks.length) return 'off';
      const pref = store.get('as_vp_sub', '');
      if (pref === 'off') return 'off';
      if (pref) {
        const hit = tracks.find(t => t.lang === pref || t.label.toLowerCase() === pref);
        if (hit) return hit.key;
      }
      if (subsOff) return 'off';
      const d = tracks.find(t => t.default) || tracks.find(t => /^en/.test(t.lang) || /english/i.test(t.label)) || tracks[0];
      return d.key;
    }
    function setSubtitles(list, subsOff) {
      S.tracks = (list || []).map((t, i) => ({ ...t, key: 't' + i, short: (t.lang || t.label || '').slice(0, 3).toUpperCase() }));
      S.trackKey = 'off'; S.cues = []; S.lastCueKey = '#'; ccBox.innerHTML = '';
      paintCC();
      const k = pickInitial(S.tracks, subsOff);
      if (k !== 'off') selectTrack(k, false);
    }

    /* ---- Source handling ---- */
    function destroyHls() { if (S.hls) { try { S.hls.destroy(); } catch { } S.hls = null; } S.levels = []; S.level = -1; }
    async function attach(src, startAt, keepPlaying) {
      const seq = ++S.srcSeq;
      destroyHls();
      S.ready = false;
      root.classList.add('is-loading');
      const resume = startAt || 0;
      const onMeta = () => {
        if (resume > 1 && isFinite(video.duration) && resume < video.duration - 3) video.currentTime = resume;
        video.removeEventListener('loadedmetadata', onMeta);
      };
      video.addEventListener('loadedmetadata', onMeta);
      if (src.type === 'hls') {
        let H = null;
        try { H = await loadHls(); } catch { H = null; }
        if (seq !== S.srcSeq || S.destroyed) return;
        if (H && H.isSupported()) {
          const hls = S.hls = new H({ enableWorker: true, lowLatencyMode: false, startPosition: resume > 1 ? resume : -1 });
          hls.on(H.Events.MANIFEST_PARSED, (_, d) => {
            S.levels = (d.levels || []).map((l, i) => ({ i, h: l.height || 0, b: l.bitrate || 0 })).sort((a, b) => b.h - a.h || b.b - a.b);
            paintMenu();
          });
          hls.on(H.Events.LEVEL_SWITCHED, (_, d) => { S.level = hls.autoLevelEnabled ? -1 : d.level; paintMenu(); });
          hls.on(H.Events.ERROR, (_, d) => {
            if (!d.fatal) return;
            if (d.type === H.ErrorTypes.NETWORK_ERROR && (S.netRetry = (S.netRetry || 0) + 1) <= 2) { hls.startLoad(); return; }
            if (d.type === H.ErrorTypes.MEDIA_ERROR && (S.mediaRetry = (S.mediaRetry || 0) + 1) <= 2) { hls.recoverMediaError(); return; }
            fail('The stream stopped working');
          });
          S.netRetry = 0; S.mediaRetry = 0;
          hls.loadSource(src.url); hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src.url;
        } else { fail('This browser cannot play this stream'); return; }
      } else {
        video.src = src.url;
      }
      if (keepPlaying) video.play().catch(() => { });
    }
    function fail(msg) {
      if (S.destroyed) return;
      root.classList.remove('is-loading');
      root.classList.add('has-error');
      if (opts.onError) opts.onError({ message: msg });
    }
    function load(media, o) {
      o = o || {};
      S.media = media; S.srcIdx = 0; S.startAt = o.startAt || 0; S.delay = 0;
      S.intro = media.intro || null; S.outro = media.outro || null;
      root.classList.remove('has-error', 'is-idle');
      if (media.poster) video.poster = media.poster; else video.removeAttribute('poster');
      if (media.title) setMeta({ title: media.title });
      paintMarks(); paintNav();
      setSubtitles(media.subtitles, !!o.subsOff);
      attach(media.sources[0], S.startAt, false).then(() => {
        if (o.autoplay) {
          const p = video.play();
          if (p && p.catch) p.catch(() => { setPlayIcon(); showControls(true); });
        }
      });
      setupMediaSession();
    }
    function switchSource(i) {
      if (!S.media || !S.media.sources[i] || i === S.srcIdx) return;
      const t = video.currentTime, was = !video.paused;
      S.srcIdx = i;
      attach(S.media.sources[i], t, was);
      paintMenu();
    }
    function setLevel(i) {
      if (!S.hls) return;
      S.hls.currentLevel = i;                 // -1 = automatic
      S.level = i;
      paintMenu();
    }

    /* ---- Actions ---- */
    const playing = () => !video.paused && !video.ended;
    function toggle() {
      if (video.ended) { video.currentTime = 0; }
      if (video.paused || video.ended) { const p = video.play(); if (p && p.catch) p.catch(() => { }); } else video.pause();
    }
    function seekBy(d) { video.currentTime = clamp(video.currentTime + d, 0, video.duration || 1e9); }
    function seekTo(t) { video.currentTime = clamp(t, 0, video.duration || 1e9); }
    function setMeta(m) {
      if (m.title != null) els.ttl.textContent = m.title;
      if (m.sub != null) els.sub.textContent = m.sub;
      if (navigator.mediaSession && m.title != null) setupMediaSession();
    }
    function note(text, ms) {
      clearTimeout(S.noteT);
      els.note.textContent = text; els.note.classList.add('on');
      if (ms) S.noteT = setTimeout(() => els.note.classList.remove('on'), ms);
    }
    function fsOn() { return document.fullscreenElement === root || document.webkitFullscreenElement === root; }
    function toggleFs() {
      if (fsOn()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const f = root.requestFullscreen || root.webkitRequestFullscreen;
      if (f) {
        Promise.resolve(f.call(root)).then(() => {
          try { if (screen.orientation && screen.orientation.lock && isTouch() && video.videoWidth > video.videoHeight) screen.orientation.lock('landscape').catch(() => { }); } catch { }
        }).catch(() => { });
      } else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();     // iPhone: the system player takes over
    }
    function togglePip() {
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => { });
      else if (video.requestPictureInPicture) video.requestPictureInPicture().catch(() => note('Picture in picture is not available', 2000));
    }
    function setupMediaSession() {
      const ms = navigator.mediaSession; if (!ms) return;
      try {
        ms.metadata = new MediaMetadata({ title: els.ttl.textContent || 'Amnestream', artist: els.sub.textContent || 'Amnestream', artwork: S.media && S.media.poster ? [{ src: S.media.poster }] : [] });
        ms.setActionHandler('play', () => video.play());
        ms.setActionHandler('pause', () => video.pause());
        ms.setActionHandler('seekbackward', d => seekBy(-(d && d.seekOffset || 10)));
        ms.setActionHandler('seekforward', d => seekBy(d && d.seekOffset || 10));
        ms.setActionHandler('previoustrack', opts.hasPrev && opts.hasPrev() ? () => opts.onPrev && opts.onPrev() : null);
        ms.setActionHandler('nexttrack', opts.hasNext && opts.hasNext() ? () => opts.onNext && opts.onNext() : null);
      } catch { }
    }

    /* ---- Controls visibility ---- */
    function showControls(stay) {
      root.classList.add('controls-on');
      clearTimeout(S.hideT);
      if (stay || !playing() || root.classList.contains('menu-open') || S.seeking) return;
      S.hideT = setTimeout(() => { if (playing() && !root.classList.contains('menu-open') && !S.seeking) root.classList.remove('controls-on'); }, 2800);
    }
    const hideNow = () => { if (playing() && !root.classList.contains('menu-open')) root.classList.remove('controls-on'); };

    /* ---- Menu (settings, captions, quality, speed, style) ---- */
    const row = (label, val, attrs, check) =>
      `<button class="vp-row${check ? ' sel' : ''}" type="button" role="menuitem" ${attrs}><span>${label}</span>${val != null ? `<em>${val}</em>` : ''}${check ? ico('check', 16) : ico('chev', 16)}</button>`;
    function qualityList() {
      if (S.hls && S.levels.length) return [{ id: -1, label: 'Auto' }].concat(S.levels.map(l => ({ id: l.i, label: l.h ? l.h + 'p' : Math.round(l.b / 1000) + ' kbps' })));
      if (S.media && S.media.sources.length > 1) return S.media.sources.map((s, i) => ({ id: i, label: s.label || 'Source ' + (i + 1), file: true }));
      return null;
    }
    const qualityLabel = () => {
      const ql = qualityList(); if (!ql) return S.media && S.media.sources[0] && S.media.sources[0].label || 'Original';
      if (ql[0].file) return ql[S.srcIdx].label;
      if (S.level === -1) { const cur = S.hls && S.hls.levels && S.hls.levels[S.hls.currentLevel]; return 'Auto' + (cur && cur.height ? ' (' + cur.height + 'p)' : ''); }
      return (ql.find(x => x.id === S.level) || {}).label || 'Auto';
    };
    function menuHTML(page) {
      const back = t => `<div class="vp-mh"><button class="vp-mback" type="button" data-go="main" aria-label="Back">${ico('back', 18)}</button><b>${t}</b></div>`;
      if (page === 'captions') {
        const list = [`<button class="vp-row${S.trackKey === 'off' ? ' sel' : ''}" type="button" role="menuitemradio" data-sub="off"><span>Off</span>${S.trackKey === 'off' ? ico('check', 16) : ''}</button>`]
          .concat(S.tracks.map(t => `<button class="vp-row${S.trackKey === t.key ? ' sel' : ''}" type="button" role="menuitemradio" data-sub="${t.key}"><span>${esc(t.label)}</span>${S.trackKey === t.key ? ico('check', 16) : ''}</button>`));
        const d = S.delay;
        return back('Subtitles') + `<div class="vp-list">${list.join('')}</div>
          <div class="vp-sync"><span>Sync</span><button type="button" data-delay="-0.5" aria-label="Show earlier">-0.5</button><output>${(d > 0 ? '+' : '') + d.toFixed(1)}s</output><button type="button" data-delay="0.5" aria-label="Show later">+0.5</button><button type="button" data-delay="0" class="rs">Reset</button></div>`;
      }
      if (page === 'quality') {
        const ql = qualityList() || [];
        return back('Quality') + `<div class="vp-list">${ql.map(x => {
          const sel = x.file ? x.id === S.srcIdx : x.id === S.level;
          return `<button class="vp-row${sel ? ' sel' : ''}" type="button" role="menuitemradio" data-q="${x.id}"><span>${esc(x.label)}</span>${sel ? ico('check', 16) : ''}</button>`;
        }).join('')}</div>`;
      }
      if (page === 'speed') {
        return back('Speed') + `<div class="vp-list">${RATES.map(r => `<button class="vp-row${video.playbackRate === r ? ' sel' : ''}" type="button" role="menuitemradio" data-rate="${r}"><span>${r === 1 ? 'Normal' : r + 'x'}</span>${video.playbackRate === r ? ico('check', 16) : ''}</button>`).join('')}</div>`;
      }
      if (page === 'style') {
        const c = S.ccStyle, seg = (k, opts2) => `<div class="vp-seg" data-k="${k}">${opts2.map(([v, l]) => `<button type="button" class="${String(c[k]) === String(v) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
        const sw = ['#ffffff', '#ffe066', '#7be0ff', '#ff9ecb'].map(col => `<button type="button" class="vp-sw${c.color === col ? ' on' : ''}" data-color="${col}" style="--c:${col}" aria-label="${col}"></button>`).join('');
        return back('Subtitle style') + `<div class="vp-form">
          <label>Size</label>${seg('size', [[0.8, 'S'], [1, 'M'], [1.3, 'L'], [1.7, 'XL']])}
          <label>Background</label>${seg('bg', [['none', 'Outline'], ['shadow', 'Shadow'], ['box', 'Box']])}
          <label>Colour</label><div class="vp-sws">${sw}</div>
          <label>Position</label>${seg('high', [[false, 'Low'], [true, 'Raised']])}
        </div>`;
      }
      const ql = qualityList(), trk = S.trackKey === 'off' ? 'Off' : (S.tracks.find(t => t.key === S.trackKey) || {}).label;
      return `<div class="vp-list">` +
        (S.tracks.length ? row('Subtitles', esc(trk || 'Off'), 'data-go="captions"') : '') +
        row('Quality', esc(qualityLabel()), ql ? 'data-go="quality"' : 'disabled') +
        row('Speed', video.playbackRate === 1 ? 'Normal' : video.playbackRate + 'x', 'data-go="speed"') +
        (S.tracks.length ? row('Subtitle style', null, 'data-go="style"') : '') + `</div>`;
    }
    function paintMenu() {
      if (els.menu.hidden || !S.menuPage) return;
      const keep = els.menu.querySelector('.vp-list') ? els.menu.querySelector('.vp-list').scrollTop : 0;
      els.menu.innerHTML = menuHTML(S.menuPage);
      const l = els.menu.querySelector('.vp-list'); if (l) l.scrollTop = keep;
    }
    function openMenu(page) {
      if (!els.menu.hidden && S.menuPage === page && page !== 'main') { closeMenu(); return; }
      S.menuPage = page;
      els.menu.hidden = false;
      root.classList.add('menu-open');
      els.menu.innerHTML = menuHTML(page);
      els.ccb.classList.toggle('open', page === 'captions');
      showControls(true);
      const f = els.menu.querySelector('.sel, .vp-row, .vp-mback'); if (f && !isTouch()) f.focus({ preventScroll: true });
    }
    function closeMenu() {
      els.menu.hidden = true; S.menuPage = null;
      root.classList.remove('menu-open');
      els.ccb.classList.remove('open');
      showControls();
    }
    on(els.menu, 'click', e => {
      const b = e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      if (b.dataset.go) { S.menuPage = b.dataset.go; paintMenu(); const f = els.menu.querySelector('.sel'); if (f && !isTouch()) f.focus({ preventScroll: true }); return; }
      if (b.dataset.sub != null) { selectTrack(b.dataset.sub, true); return; }
      if (b.dataset.q != null) { const id = +b.dataset.q; (qualityList() || [{}])[0].file ? switchSource(id) : setLevel(id); return; }
      if (b.dataset.rate) { video.playbackRate = +b.dataset.rate; paintMenu(); return; }
      if (b.dataset.delay != null) { const v = +b.dataset.delay; S.delay = v === 0 ? 0 : Math.round((S.delay + v) * 10) / 10; S.lastCueKey = '#'; drawCaptions(true); paintMenu(); return; }
      const seg = b.closest('.vp-seg');
      if (seg && b.dataset.v != null) {
        const k = seg.dataset.k, v = b.dataset.v;
        S.ccStyle[k] = k === 'size' ? +v : k === 'high' ? v === 'true' : v;
        store.set('as_vp_cc', JSON.stringify(S.ccStyle)); applyCCStyle(); paintMenu(); return;
      }
      if (b.dataset.color) { S.ccStyle.color = b.dataset.color; store.set('as_vp_cc', JSON.stringify(S.ccStyle)); applyCCStyle(); paintMenu(); }
    });
    on(document, 'pointerdown', e => { if (!els.menu.hidden && !e.target.closest('.vp-menu, .vp-set, .vp-ccb')) closeMenu(); }, true);

    /* ---- Seek bar ---- */
    const fracOf = e => { const r = els.seek.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
    function showTip(e) {
      const d = video.duration; if (!(d > 0)) return;
      const r = els.seek.getBoundingClientRect(), f = fracOf(e);
      els.tip.textContent = fmt(f * d);
      els.tip.style.left = clamp(f * r.width, 22, r.width - 22) + 'px';
    }
    on(els.seek, 'pointerdown', e => {
      if (e.button > 0 || !(video.duration > 0)) return;
      S.seeking = true; root.classList.add('is-seeking');
      try { els.seek.setPointerCapture(e.pointerId); } catch { }
      seekTo(fracOf(e) * video.duration); showTip(e); paintTime(); showControls(true);
    });
    on(els.seek, 'pointermove', e => {
      showTip(e);
      if (S.seeking) { seekTo(fracOf(e) * video.duration); paintTime(); }
    });
    const endSeek = () => { if (!S.seeking) return; S.seeking = false; root.classList.remove('is-seeking'); showControls(); };
    on(els.seek, 'pointerup', endSeek);
    on(els.seek, 'pointercancel', endSeek);

    /* ---- Volume ---- */
    let volDrag = false;
    const volAt = e => { const r = els.vol.getBoundingClientRect(); video.muted = false; video.volume = clamp((e.clientX - r.left) / r.width, 0, 1); };
    on(els.vol, 'pointerdown', e => { volDrag = true; try { els.vol.setPointerCapture(e.pointerId); } catch { } volAt(e); });
    on(els.vol, 'pointermove', e => { if (volDrag) volAt(e); });
    on(els.vol, 'pointerup', () => { volDrag = false; });
    on(els.vol, 'pointercancel', () => { volDrag = false; });

    /* ---- Buttons ---- */
    on(els.play, 'click', toggle);
    on(els.rw, 'click', () => seekBy(-10));
    on(els.ff, 'click', () => seekBy(10));
    on(els.prev, 'click', () => opts.onPrev && opts.onPrev());
    on(els.next, 'click', () => opts.onNext && opts.onNext());
    on(els.mute, 'click', () => { video.muted = !video.muted; if (!video.muted && video.volume === 0) video.volume = 0.6; });
    on(els.ccb, 'click', () => S.tracks.length && openMenu('captions'));
    on(els.set, 'click', () => (!els.menu.hidden && S.menuPage === 'main') ? closeMenu() : openMenu('main'));
    on(els.pip, 'click', togglePip);
    on(els.fs, 'click', toggleFs);
    on(els.skip, 'click', e => {
      e.stopPropagation();
      if (els.skip.dataset.kind === 'intro' && S.intro) seekTo(S.intro.end);
      else if (els.skip.dataset.kind === 'outro') { if (opts.onNext) opts.onNext(); else if (S.outro) seekTo(S.outro.end); }
    });
    if (!document.pictureInPictureEnabled || !video.requestPictureInPicture) els.pip.hidden = true;
    if (!(root.requestFullscreen || root.webkitRequestFullscreen || video.webkitEnterFullscreen)) els.fs.hidden = true;

    /* ---- Touch and mouse on the picture ---- */
    let tapTimer = 0, lastTap = { t: 0, x: 0 }, press = null, holding = false;
    const zoneOf = (x, r) => { const f = (x - r.left) / r.width; return f < 0.34 ? 'l' : f > 0.66 ? 'r' : 'c'; };
    function ripple(side, text) {
      const el = side === 'l' ? els.tapL : els.tapR;
      el.querySelector('b').textContent = text;
      el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    }
    let skipSum = 0, skipT = 0;
    function doubleTapSeek(side) {
      skipSum += 10; clearTimeout(skipT); skipT = setTimeout(() => { skipSum = 0; }, 700);
      seekBy(side === 'l' ? -10 : 10); ripple(side, skipSum);
    }
    const interactive = t => t.closest('button, .vp-bar, .vp-menu, .vp-skip, .vp-chip, .vp-mid');
    on(root, 'pointerdown', e => {
      if (interactive(e.target) || e.button > 0) return;
      press = { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType, id: e.pointerId, moved: false, hold: 0 };
      if (e.pointerType === 'touch') {
        const r = root.getBoundingClientRect();
        if (zoneOf(e.clientX, r) !== 'l') press.hold = setTimeout(() => {            // Press and hold: 2x while the finger stays down
          if (!press || press.moved || !playing()) return;
          holding = true; S.rateBeforeHold = video.playbackRate; video.playbackRate = 2; root.classList.add('is-fast');
        }, 480);
      }
    });
    on(root, 'pointermove', e => {
      if (e.pointerType === 'mouse') showControls();
      if (!press) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) { press.moved = true; clearTimeout(press.hold); }
    });
    const releasePress = () => {
      if (holding) { holding = false; video.playbackRate = S.rateBeforeHold; root.classList.remove('is-fast'); }
    };
    on(root, 'pointercancel', () => { if (press) clearTimeout(press.hold); press = null; releasePress(); });
    on(root, 'pointerup', e => {
      if (!press) return;
      const p = press; press = null;
      clearTimeout(p.hold);
      if (holding) { releasePress(); return; }
      if (p.moved || performance.now() - p.t > 600) return;
      const r = root.getBoundingClientRect(), zone = zoneOf(e.clientX, r), now = performance.now();
      if (!els.menu.hidden) { closeMenu(); return; }
      if (root.classList.contains('is-mini')) { toggle(); return; }          // In the small window a tap just plays or pauses
      if (p.type === 'touch') {
        const dbl = now - lastTap.t < 300 && Math.abs(e.clientX - lastTap.x) < 90;
        if (dbl && zone !== 'c') { clearTimeout(tapTimer); lastTap.t = now; lastTap.x = e.clientX; doubleTapSeek(zone); return; }
        if (dbl && zone === 'c') { clearTimeout(tapTimer); lastTap.t = 0; toggle(); return; }
        lastTap = { t: now, x: e.clientX };
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { root.classList.contains('controls-on') && playing() ? hideNow() : showControls(); }, 260);
      } else {
        clearTimeout(tapTimer);
        if (now - lastTap.t < 280) { lastTap.t = 0; toggleFs(); return; }       // Double click: fullscreen
        lastTap.t = now;
        tapTimer = setTimeout(toggle, 230);
      }
    });
    on(root, 'dblclick', e => e.preventDefault());
    on(root, 'contextmenu', e => { if (e.target === video) e.preventDefault(); });
    on(root, 'pointerleave', e => { if (e.pointerType === 'mouse' && playing()) { clearTimeout(S.hideT); S.hideT = setTimeout(hideNow, 900); } });
    on(root, 'focusin', () => showControls());

    /* ---- Keyboard ---- */
    on(document, 'keydown', e => {
      if (S.destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (t && t !== document.body && t !== root && !root.contains(t) && !/^(BUTTON|A)$/.test(t.tagName) ) return;
      if (t && t.closest && t.closest('.um, .epm')) return;
      if (e.key === 'Escape' && !els.menu.hidden) { e.preventDefault(); closeMenu(); return; }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let used = true;
      if (k === ' ' && t && /^(BUTTON|A)$/.test(t.tagName)) return;               // Space on a focused button keeps its normal job
      if (k === ' ' || k === 'k') toggle();
      else if (k === 'ArrowRight') seekBy(5);
      else if (k === 'ArrowLeft') seekBy(-5);
      else if (k === 'l') seekBy(10);
      else if (k === 'j') seekBy(-10);
      else if (k === 'ArrowUp') { video.muted = false; video.volume = clamp(video.volume + 0.05, 0, 1); }
      else if (k === 'ArrowDown') video.volume = clamp(video.volume - 0.05, 0, 1);
      else if (k === 'm') video.muted = !video.muted;
      else if (k === 'f') toggleFs();
      else if (k === 'c') { if (S.tracks.length) selectTrack(S.trackKey === 'off' ? (S.lastOn || S.tracks[0].key) : (S.lastOn = S.trackKey, 'off'), true); }
      else if (k === 'n') { if (opts.hasNext && opts.hasNext() && opts.onNext) opts.onNext(); }
      else if (k === 'p') { if (opts.hasPrev && opts.hasPrev() && opts.onPrev) opts.onPrev(); }
      else if (k === '>' || k === '.') { const i = RATES.indexOf(video.playbackRate); video.playbackRate = RATES[clamp((i < 0 ? 2 : i) + 1, 0, RATES.length - 1)]; note(video.playbackRate + 'x', 900); }
      else if (k === '<' || k === ',') { const i = RATES.indexOf(video.playbackRate); video.playbackRate = RATES[clamp((i < 0 ? 2 : i) - 1, 0, RATES.length - 1)]; note(video.playbackRate + 'x', 900); }
      else if (/^[0-9]$/.test(k) && video.duration) seekTo(video.duration * (+k / 10));
      else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); showControls(); }
    });

    /* ---- Media events ---- */
    const loop = () => {
      S.raf = 0;
      if (S.destroyed) return;
      if (!S.seeking) paintTime();
      drawCaptions(false);
      if (!video.paused) S.raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!S.raf) S.raf = requestAnimationFrame(loop); };
    let lastProg = 0;
    on(video, 'play', () => { setPlayIcon(); kick(); showControls(); root.classList.remove('is-idle'); });
    on(video, 'playing', () => { root.classList.remove('is-loading', 'has-error'); setPlayIcon(); kick(); });
    on(video, 'pause', () => { setPlayIcon(); showControls(true); paintTime(); drawCaptions(false); });
    on(video, 'waiting', () => root.classList.add('is-loading'));
    on(video, 'seeking', () => { S.lastCueKey = '#'; drawCaptions(true); paintTime(); });
    on(video, 'seeked', () => { root.classList.remove('is-loading'); paintTime(); paintBuffer(); drawCaptions(true); });
    on(video, 'canplay', () => { root.classList.remove('is-loading'); if (!S.ready) { S.ready = true; if (opts.onReady) opts.onReady(); } });
    on(video, 'loadedmetadata', () => { paintTime(); paintMarks(); });
    on(video, 'durationchange', () => { paintTime(); paintMarks(); });
    on(video, 'progress', paintBuffer);
    on(video, 'timeupdate', () => {
      paintBuffer(); paintSkip();
      if (!S.seeking) paintTime();
      const now = Date.now();
      if (opts.onProgress && now - lastProg > 1000 && video.duration > 0) { lastProg = now; opts.onProgress(video.currentTime / video.duration * 100, video.currentTime, video.duration); }
    });
    on(video, 'ended', () => { setPlayIcon(); showControls(true); if (opts.onProgress) opts.onProgress(100, video.duration, video.duration); if (opts.onEnded) opts.onEnded(); });
    on(video, 'volumechange', () => { paintVolume(); store.set('as_vp_vol', String(video.volume)); store.set('as_vp_muted', video.muted ? '1' : '0'); });
    on(video, 'ratechange', () => { if (!holding) paintMenu(); });
    on(video, 'error', () => {
      if (S.hls) return;                                              // hls.js reports its own fatal errors
      const e = video.error; if (!e || !video.currentSrc) return;
      const media = S.media && S.media.sources[S.srcIdx];
      if (media && S.media.sources.length > 1 && S.srcIdx < S.media.sources.length - 1) { switchSource(S.srcIdx + 1); return; }
      fail(e.code === 3 ? 'The video could not be decoded' : e.code === 4 ? 'The video link does not work' : 'The video failed to load');
    });
    on(video, 'enterpictureinpicture', () => root.classList.add('is-pip'));
    on(video, 'leavepictureinpicture', () => root.classList.remove('is-pip'));
    on(document, 'fullscreenchange', () => { const f = fsOn(); root.classList.toggle('is-fs', f); els.fs.innerHTML = ico(f ? 'fsx' : 'fs', 21); if (!f) { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch { } } });
    on(document, 'webkitfullscreenchange', () => { const f = fsOn(); root.classList.toggle('is-fs', f); els.fs.innerHTML = ico(f ? 'fsx' : 'fs', 21); });
    on(document, 'visibilitychange', () => { if (!document.hidden) { S.lastCueKey = '#'; drawCaptions(true); } });

    applyCCStyle(); paintVolume(); setPlayIcon(); paintTime(); paintCC(); paintNav();

    /* ---- Public handle ---- */
    return {
      el: root, video,
      load, setMeta, setSubtitles, setSkips(s) { S.intro = s.intro || S.intro; S.outro = s.outro || S.outro; paintMarks(); paintSkip(); },
      selectSubtitle: k => selectTrack(k, true),
      play() { const p = video.play(); if (p && p.catch) p.catch(() => { }); }, pause() { video.pause(); }, toggle, seek: seekTo, refreshNav() { paintNav(); setupMediaSession(); },
      get paused() { return video.paused; }, get currentTime() { return video.currentTime; }, get duration() { return video.duration; },
      setMini(on2) { root.classList.toggle('is-mini', !!on2); if (on2) closeMenu(); },
      destroy() {
        S.destroyed = true;
        cancelAnimationFrame(S.raf); clearTimeout(S.hideT); clearTimeout(S.noteT); clearTimeout(tapTimer);
        cleanups.forEach(fn => fn());
        destroyHls();
        try { video.pause(); video.removeAttribute('src'); video.load(); } catch { }
        if (navigator.mediaSession) try { navigator.mediaSession.metadata = null; } catch { }
        if (document.pictureInPictureElement === video) document.exitPictureInPicture().catch(() => { });
        root.remove();
      },
    };
  }

  window.VPlayer = { create, loadHls, parseSubtitles, fmt };
})();
