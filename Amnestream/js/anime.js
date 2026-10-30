/* Anime details page: poster, sidebar, synopsis and episodes / relations / recommendations / characters tabs */
const ID = Number(new URLSearchParams(location.search).get('id'));
let M = null, EPS = {}, epSearch = '';

const STATUS_LONG = { FINISHED: 'Finished Airing', RELEASING: 'Currently Airing', NOT_YET_RELEASED: 'Not Yet Aired', CANCELLED: 'Cancelled', HIATUS: 'On Hiatus' };
const AUDIO_OF = { JP: 'Japanese', CN: 'Chinese', TW: 'Chinese', KR: 'Korean' };
const compact = n => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
const dateLong = d => (d && d.year)
  ? new Date(d.year, (d.month || 1) - 1, d.day || 1).toLocaleDateString('en', { month: 'long', day: d.day ? 'numeric' : undefined, year: 'numeric' }) : 'TBA';

/* Favourites (heart button), stored locally and included in the sync code */
const Fav = {
  ids: () => jget('as_fav', []),
  has: id => Fav.ids().includes(id),
  toggle(id) {
    const l = Fav.ids(), i = l.indexOf(id);
    if (i > -1) l.splice(i, 1); else l.unshift(id);
    jset('as_fav', l.slice(0, 500));
    Sync.touch('fav');
    return i === -1;
  },
};

async function initAnime() {
  if (!localStorage.getItem('as_epstyle19')) {            // Default to the episode-card layout once for existing users
    localStorage.setItem('as_epstyle19', '1');
    if (Settings.get().epStyle === 'grid') Settings.set('epStyle', 'list');
  }
  if (!ID) { location.href = 'index.html'; return; }
  try {
    const { Media } = await Api.anime(ID);
    M = Media;
    document.title = titleOf(M) + ' - Amnestream';
    (M.streamingEpisodes || []).forEach(e => {
      const x = /(\d+)\s*[-–:.]\s*(.*)$/.exec(e.title || '') || /Episode\s+(\d+)/i.exec(e.title || '');
      if (x && !EPS[+x[1]]) EPS[+x[1]] = { title: x[2] || '', thumb: e.thumbnail };
    });
    render();
  } catch (err) {
    $('#dp').innerHTML = `<div style="padding:80px 24px"><h1>Not found</h1><p class="muted">${esc(err.message)}</p></div>`;
  }
}

const metaRow = (k, v) => v ? `<div><dt class="dp-lbl">${k}</dt><dd>${v}</dd></div>` : '';
const chips = list => `<div class="dp-chips">${list.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
const rateHTML = (val, count, ico, label, tip) => `
  <div class="dp-rate" title="${esc(tip)}">
    <span class="dp-rate-ico">${icon('star', 15)}</span>
    <div><b>${val}</b><small>${icon(ico, 10)} ${count} ${label}</small></div>
  </div>`;

function render() {
  const m = M, total = epCountOf(m), title = titleOf(m);
  const prog = Store.progress()[m.id];
  const watchEp = Settings.get().resume && prog ? Math.min(prog.ep, total) : 1;
  const inList = Store.inList(m.id), isFav = Fav.has(m.id);
  const next = m.nextAiringEpisode;
  const released = airedCount(m), noEps = released === 0;
  const alt = [m.title.romaji, m.title.english, m.title.native].find(t => t && t !== title);
  const audio = AUDIO_OF[m.countryOfOrigin];
  const tags = (m.tags || []).filter(t => !t.isMediaSpoiler && !t.isGeneralSpoiler && t.rank >= 50).slice(0, 5).map(t => t.name);
  const studios = (m.studios?.nodes || []).map(s => s.name);
  const rel = (m.relations?.edges || []).filter(e => e.node);
  const chars = m.characters?.nodes || [];
  const recs = (m.recommendations?.nodes || []).map(n => n.mediaRecommendation).filter(Boolean).filter(hasEpisodes);
  const avg = scoreOf(m), mean = m.meanScore ? (m.meanScore / 10).toFixed(1) : null;
  const trailer = m.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${m.trailer.id}` : '';
  const nextIn = next ? `Ep ${next.episode} in ${Math.floor(next.timeUntilAiring / 86400)}d ${Math.floor(next.timeUntilAiring % 86400 / 3600)}h` : '';

  $('#dp-bg').innerHTML = bannerOf(m) ? `<img class="${m.bannerImage ? '' : 'soft'}" src="${esc(bannerOf(m))}" alt="" onload="this.classList.add('ready')">` : '';

  $('#dp').innerHTML = `
  <div class="dp">
    <aside class="dp-side">
      <div class="dp-side-top">
        <div class="dp-poster"><img src="${esc(coverOf(m))}" alt="${esc(title)}"></div>
        ${trailer ? `<a class="dp-trailer" id="trailer-btn" target="_blank" rel="noopener" href="${trailer}">${icon('play', 12)} Watch Trailer</a>` : ''}
      </div>
      <div class="dp-meta">
        <section><dl>
          ${metaRow('Type', esc(fmtLabel(m)))}
          ${metaRow('Status', esc(STATUS_LONG[m.status] || ''))}
          ${metaRow('Release', esc(dateLong(m.startDate)))}
          ${metaRow('Episodes', `${released}/${m.episodes || '?'}`)}
          ${metaRow('Next episode', esc(nextIn))}
          ${metaRow('Duration', m.duration ? m.duration + ' min' : '')}
          ${audio ? `<div><dt class="dp-lbl">Audio languages</dt><dd>${chips([audio])}</dd></div>` : ''}
        </dl></section>
        ${tags.length ? `<section><span class="dp-lbl">Themes</span>${chips(tags)}</section>` : ''}
        ${studios.length ? `<section><span class="dp-lbl">Studios</span>${chips(studios)}</section>` : ''}
      </div>
    </aside>

    <div class="dp-main">
      ${alt ? `<div class="dp-alt">${esc(alt)}</div>` : ''}
      <h1>${esc(title)}</h1>

      <div class="dp-row">
        <div class="dp-pills">${(m.genres || []).map(g => `<a class="dp-pill" href="browse.html?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}</div>
        <button class="dp-btn sm" id="share-btn">${icon('share', 13)} Share</button>
      </div>

      <div class="dp-row">
        <div class="dp-actions">
          ${noEps ? `<span class="dp-btn primary" aria-disabled="true" style="opacity:.55;cursor:default;pointer-events:none">${icon('clock', 13)} Not aired yet</span>`
            : `<a class="dp-btn primary" href="watch.html?id=${m.id}&ep=${watchEp}">${icon('play', 13)} Watch Ep ${watchEp}</a>`}
          <button class="dp-btn ${inList ? 'on' : ''}" id="list-btn">${icon(inList ? 'check' : 'plus', 14)} <span>${inList ? 'In My List' : 'Add to My List'}</span></button>
          <button class="dp-btn ico ${isFav ? 'on' : ''}" id="fav-btn" title="${isFav ? 'Remove from favourites' : 'Add to favourites'}" aria-label="Favourite">${icon('heart', 16)}</button>
          <a class="dp-ext al" target="_blank" rel="noopener" href="https://anilist.co/anime/${m.id}" title="Open on AniList">A</a>
          ${m.idMal ? `<a class="dp-ext mal" target="_blank" rel="noopener" href="https://myanimelist.net/anime/${m.idMal}" title="Open on MyAnimeList">MAL</a>` : ''}
        </div>
        ${avg ? `<div class="dp-rates">
          ${rateHTML(avg, compact(m.popularity), 'user', 'Average', `Average score, ${(m.popularity || 0).toLocaleString()} users`)}
          ${mean ? rateHTML(mean, compact(m.favourites), 'heart', 'Mean', `Mean score, ${(m.favourites || 0).toLocaleString()} favourites`) : ''}
        </div>` : ''}
      </div>

      <div class="dp-syn">
        <span class="dp-lbl">Synopsis</span>
        <p class="clamp" id="syn-text">${esc(stripTags(m.description || 'No synopsis yet.'))}</p>
        <button class="dp-more" id="syn-more" hidden>Read More &rarr;</button>
      </div>

      <div class="dp-tabs" role="tablist">
        <span class="dp-ink" aria-hidden="true"></span>
        <button class="dp-tab on" data-p="ep">Episodes</button>
        <button class="dp-tab" data-p="rel" ${rel.length ? '' : 'disabled'}>Relations</button>
        <button class="dp-tab" data-p="rec" ${recs.length ? '' : 'disabled'}>Recommendations</button>
        ${chars.length ? '<button class="dp-tab" data-p="ch">Characters</button>' : ''}
      </div>

      <div class="dp-panel on" id="p-ep">
        <div class="dp-eptools">
          <input class="dp-search" id="ep-q" placeholder="Search episode..." aria-label="Search episodes">
          <button class="dp-tool" id="ep-find" title="Search episodes" aria-label="Search episodes">${icon('search', 14)}</button>
          <button class="dp-tool" id="ep-style"></button>
          <button class="dp-tool" id="ep-sort"></button>
        </div>
        <div id="ep-wrap"></div>
      </div>

      ${rel.length ? `<div class="dp-panel" id="p-rel"><div class="grid">${rel.map(e => {
        const n = e.node;
        const rt = n.status === 'NOT_YET_RELEASED' ? null : playTarget(n), rtitle = titleOf(n);
        return `<article class="card"><div class="card-media">
          <img loading="lazy" src="${esc(n.coverImage?.large || '')}" alt="">
          ${hitHTML(`anime.html?id=${n.id}`, rtitle)}${rt ? playBtnHTML(rt.href, rt.label) : ''}
          <span class="card-tags"><span class="tag fmt">${esc(e.relationType.replace(/_/g, ' ').toLowerCase())}</span></span>
        </div><a class="card-title" href="anime.html?id=${n.id}">${esc(rtitle)}</a></article>`;
      }).join('')}</div></div>` : ''}

      ${recs.length ? `<div class="dp-panel" id="p-rec"><div class="grid">${recs.map(cardHTML).join('')}</div></div>` : ''}

      ${chars.length ? `<div class="dp-panel" id="p-ch"><div class="dp-chars">${chars.map(c => `
        <div class="dp-char"><img loading="lazy" src="${esc(c.image?.medium || '')}" alt=""><p>${esc(c.name.full)}</p></div>`).join('')}</div></div>` : ''}
    </div>
  </div>`;

  /* Buttons */
  $('#list-btn').onclick = e => {
    const added = Store.toggleList(m), b = e.currentTarget;
    b.classList.toggle('on', added);
    b.innerHTML = icon(added ? 'check' : 'plus', 14) + ` <span>${added ? 'In My List' : 'Add to My List'}</span>`;
    toast(added ? 'Added to your list' : 'Removed from your list');
  };
  $('#fav-btn').onclick = e => {
    const on = Fav.toggle(m.id), b = e.currentTarget;
    b.classList.toggle('on', on);
    b.title = on ? 'Remove from favourites' : 'Add to favourites';
    toast(on ? 'Added to favourites' : 'Removed from favourites');
  };
  $('#share-btn').onclick = async () => {
    try { if (navigator.share) { await navigator.share({ title, url: location.href }); return; } } catch { return; }   // Share sheet closed
    navigator.clipboard?.writeText(location.href).then(() => toast('Link copied'));
  };

  /* Synopsis: show Read More only when the text is cut off */
  const syn = $('#syn-text'), more = $('#syn-more');
  const fit = () => { if (syn.classList.contains('clamp')) more.hidden = syn.scrollHeight <= syn.clientHeight + 1; };
  more.onclick = () => {
    const open = syn.classList.toggle('clamp');
    more.innerHTML = open ? 'Read More &rarr;' : 'Show Less &larr;';
  };
  fit();
  document.fonts?.ready.then(fit);

  /* Tabs */
  /* Sliding highlight under the active tab */
  const ink = $('.dp-ink');
  const placeInk = () => {
    const on = $('.dp-tab.on'); if (!on || !ink) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    requestAnimationFrame(() => ink.classList.add('ready'));      // First placement jumps, later ones slide
  };
  /* Tab content fades in with staggered cards */
  let animT = 0;
  const animatePanel = panel => {
    if (!panel) return;
    $$('.ep-card, .card, .dp-char', panel).slice(0, 24).forEach((el, i) => el.style.setProperty('--i', i));
    panel.classList.remove('dp-anim'); void panel.offsetWidth;    // Restart the animation
    panel.classList.add('dp-anim');
    clearTimeout(animT); animT = setTimeout(() => panel.classList.remove('dp-anim'), 1400);
  };
  $$('.dp-tab').forEach(t => t.onclick = () => {
    if (t.classList.contains('on') || t.disabled) return;
    $$('.dp-tab').forEach(x => x.classList.toggle('on', x === t));
    $$('.dp-panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t.dataset.p));
    placeInk(); animatePanel($('#p-' + t.dataset.p));
  });
  placeInk(); document.fonts?.ready.then(placeInk); addEventListener('resize', placeInk);

  /* Episode tools */
  const q = $('#ep-q');
  $('#ep-find').onclick = () => { q.classList.toggle('open'); if (q.classList.contains('open')) q.focus(); else { q.value = ''; epSearch = ''; renderEps(); } };
  q.oninput = () => { epSearch = q.value.trim().toLowerCase(); renderEps(); };
  $('#ep-sort').onclick = () => { Settings.set('epOrder', Settings.get().epOrder === 'asc' ? 'desc' : 'asc'); renderEps(); animatePanel($('#p-ep')); };
  $('#ep-style').onclick = () => {
    const order = ['list', 'compact', 'grid'], cur = Settings.get().epStyle;
    Settings.set('epStyle', order[(order.indexOf(cur) + 1) % 3]); renderEps(); animatePanel($('#p-ep'));
  };
  renderEps(); animatePanel($('#p-ep'));

  /* Episode click opens the preview modal; ctrl/cmd-click opens the player page */
  $('#ep-wrap').addEventListener('click', e => {
    if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a'), c = a?.closest('.ep-card');
    if (!c) return;
    e.preventDefault();
    const chip = a.classList.contains('ep-chip');
    EpModal.open(+c.dataset.n, { lang: chip ? a.dataset.l : undefined, play: chip });
  });
  const tb = $('#trailer-btn');
  if (tb && m.trailer?.id) tb.addEventListener('click', e => {
    if (e.button || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); TrailerModal.open(m.trailer);
  });
}

/* Modals: episode preview and trailer */
function openShell(cls, inner, onClose) {
  const el = document.createElement('div');
  el.className = 'epm ' + cls;
  el.innerHTML = `<div class="epm-dialog" role="dialog" aria-modal="true">${inner}</div>`;
  document.body.appendChild(el);
  document.body.classList.add('modal-open');
  const prevFocus = document.activeElement;
  const close = () => {
    document.removeEventListener('keydown', key, true);
    el.classList.remove('on');
    document.body.classList.remove('modal-open');
    setTimeout(() => el.remove(), 180);                       // Fade out, then remove the iframe to stop playback
    try { prevFocus?.focus?.({ preventScroll: true }); } catch { /* ignore */ }
    onClose?.();
  };
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (el._key) el._key(e);
  };
  document.addEventListener('keydown', key, true);
  el.addEventListener('mousedown', e => { if (e.target === el) close(); });
  requestAnimationFrame(() => el.classList.add('on'));
  return { el, close };
}

const TrailerModal = {
  open(t) {
    const src = t.site === 'youtube' ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(t.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
      : t.site === 'dailymotion' ? `https://www.dailymotion.com/embed/video/${encodeURIComponent(t.id)}?autoplay=1` : '';
    if (!src) return;
    const { el, close } = openShell('trailer', `
      <button class="epm-x" aria-label="Close">${icon('close', 18)}</button>
      <div class="epm-stage on-air"><iframe src="${src}" title="Trailer" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <div class="epm-info"><span class="dp-lbl">Trailer</span><h2>${esc(titleOf(M))}</h2></div>`);
    $('.epm-x', el).onclick = close;
  },
};

/* Episode preview: in-place playback, SUB/DUB switch, prev/next, open full player */
const EpModal = {
  n: 1, lang: 'sub', playing: false, ui: null, dirty: false,
  open(n, { lang, play = false } = {}) {
    this.n = n;
    this.lang = lang || localStorage.getItem('as_lang') || Settings.get().audio;
    this.playing = false; this.dirty = false;
    this.ui = openShell('episode', '', () => { this.ui = null; this.playing = false; window.removeEventListener('message', this.onMsg); if (this.dirty) renderEps(); });
    this.ui.el._key = e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') this.go(this.n + 1);
      if (e.key === 'ArrowLeft') this.go(this.n - 1);
    };
    window.addEventListener('message', this.onMsg);
    this.paint();
    if (play) this.start();
  },
  url() {
    const server = localStorage.getItem('as_server') || 'ani';
    return server === 'mal' && M.idMal
      ? `https://megaplay.buzz/stream/mal/${M.idMal}/${this.n}/${this.lang}`
      : `https://megaplay.buzz/stream/ani/${M.id}/${this.n}/${this.lang}`;
  },
  paint() {
    const m = M, n = this.n, total = epCountOf(m), e = EPS[n];
    const thumb = e?.thumb || bannerOf(m);
    const seen = (Store.seen()[m.id] || []).includes(n);
    const box = $('.epm-dialog', this.ui.el);
    box.innerHTML = `
      <button class="epm-x" aria-label="Close">${icon('close', 18)}</button>
      <div class="epm-stage" id="epm-stage">
        <img class="epm-thumb" src="${esc(thumb)}" alt="">
        <button class="epm-play" aria-label="Play episode ${n}">${icon('play', 26)}</button>
        ${m.duration ? `<span class="epm-dur">${m.duration}m</span>` : ''}
      </div>
      <div class="epm-info">
        <div class="epm-head">
          <div class="epm-titles">
            <span class="dp-lbl">Episode ${n} of ${total}${seen ? ' &middot; Watched' : ''}</span>
            <h2>${esc(e?.title || 'Episode ' + n)}</h2>
            <p>${esc(titleOf(m))}</p>
          </div>
          <div class="epm-seg" role="group" aria-label="Audio">
            <button data-l="sub" class="${this.lang === 'sub' ? 'on' : ''}">SUB</button>
            <button data-l="dub" class="${this.lang === 'dub' ? 'on' : ''}">DUB</button>
          </div>
        </div>
        <div class="epm-actions">
          <button class="dp-btn ico" id="epm-prev" title="Previous episode" aria-label="Previous episode" ${n <= 1 ? 'disabled' : ''}>${icon('prev', 14)}</button>
          <button class="dp-btn ico" id="epm-next" title="Next episode" aria-label="Next episode" ${n >= total ? 'disabled' : ''}>${icon('next', 14)}</button>
          <a class="dp-btn primary" id="epm-full" href="watch.html?id=${m.id}&ep=${n}&lang=${this.lang}">${icon('ext', 13)} Open full player</a>
        </div>
        <p class="epm-hint" id="epm-hint" hidden></p>
      </div>`;
    $('.epm-x', box).onclick = () => this.ui.close();
    $('.epm-play', box).onclick = () => this.start();
    $('#epm-prev', box).onclick = () => this.go(n - 1);
    $('#epm-next', box).onclick = () => this.go(n + 1);
    $$('.epm-seg button', box).forEach(b => b.onclick = () => this.setLang(b.dataset.l));
    $('.epm-play', box).focus({ preventScroll: true });
  },
  go(n) {
    if (!this.ui || n < 1 || n > epCountOf(M)) return;
    const was = this.playing;
    this.n = n; this.playing = false;
    this.paint();
    if (was) this.start();
  },
  setLang(l) {
    if (l === this.lang) return;
    this.lang = l;
    localStorage.setItem('as_lang', l);
    const was = this.playing;
    this.playing = false;
    this.paint();
    if (was) this.start();
  },
  start() {
    const st = $('#epm-stage', this.ui.el); if (!st) return;
    this.playing = true;
    st.classList.add('on-air');
    st.innerHTML = `<iframe src="${this.url()}" title="Episode ${this.n}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="origin"></iframe>
      <div class="epm-loading"><span class="spinner"></span>Loading player...</div>`;
    const f = $('iframe', st), hint = $('#epm-hint', this.ui.el);
    f.addEventListener('load', () => $('.epm-loading', st)?.remove());
    clearTimeout(this._slow);
    this._slow = setTimeout(() => {                                 // Never loaded: suggest what to try
      if (!hint || !$('.epm-loading', st)) return;
      hint.hidden = false;
      hint.textContent = this.lang === 'dub' ? 'Taking a while. Not every episode has a dub yet, try SUB or open the full player.' : 'Taking a while. Try the full player and switch server there.';
    }, 12000);
    Store.saveProgress(M, this.n);
    this.dirty = true;
  },
  onMsg: e => {
    if (!EpModal.ui || !String(e.origin).includes('megaplay')) return;
    let d = e.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
    if (!d) return;
    if ((d.event === 'complete' || d.event === 'ended') && Settings.get().autonext) EpModal.go(EpModal.n + 1);
    if (d.event === 'error') {
      const h = $('#epm-hint', EpModal.ui.el);
      if (h) { h.hidden = false; h.textContent = 'Playback error. Try the other audio, or open the full player and switch server.'; }
    }
  },
};

const STYLE_NAME = { list: 'Cards', compact: 'Compact', grid: 'Numbers' };

function renderEps() {
  const m = M, total = airedCount(m), s = Settings.get();
  const seen = new Set(Store.seen()[m.id] || []);
  const prog = Store.progress()[m.id];
  const cur = prog ? prog.ep : 0;
  const maxSeen = Math.max(0, ...seen);
  let nums = Array.from({ length: total }, (_, i) => i + 1);
  if (epSearch) nums = nums.filter(n => String(n) === epSearch || ('episode ' + n + ' ' + (EPS[n]?.title || '')).toLowerCase().includes(epSearch));
  if (s.epOrder === 'desc') nums.reverse();

  const style = STYLE_NAME[s.epStyle] ? s.epStyle : 'list';
  $('#ep-sort').innerHTML = icon('sort', 14) + `<span>${s.epOrder === 'desc' ? 'Newest' : 'Oldest'}</span>`;
  $('#ep-sort').title = 'Change order';
  $('#ep-style').innerHTML = icon(style === 'list' ? 'list' : 'grid', 14) + `<span>${total}</span>`;
  $('#ep-style').title = `View: ${STYLE_NAME[style]} (click to change)`;

  $('#ep-wrap').className = s.hideSpoilers ? 'spoil' : '';
  if (!total) {                                             // Nothing has aired: no made-up episode list
    const at = m.nextAiringEpisode?.airingAt, sd = m.startDate || {};
    const when = at ? new Date(at * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : sd.year ? new Date(sd.year, (sd.month || 1) - 1, sd.day || 1).toLocaleDateString(undefined, { year: 'numeric', ...(sd.month ? { month: 'long' } : {}), ...(sd.day ? { day: 'numeric' } : {}) }) : '';
    $('#ep-wrap').innerHTML = `<p class="empty">No episodes have aired yet.${when ? ` Episode 1 is expected ${esc(when)}.` : ''}</p>`;
    return;
  }
  $('#ep-wrap').innerHTML = nums.length ? `<div class="ep-cards ${style}">${nums.map(n => {
    const e = EPS[n], done = seen.has(n), href = `watch.html?id=${m.id}&ep=${n}`;
    return `<article class="ep-card ${done ? 'done' : ''} ${n === cur ? 'cur' : ''} ${n > maxSeen + 1 ? 'hide' : ''}" data-n="${n}">
      <a class="ep-thumb" href="${href}" tabindex="-1" aria-hidden="true">
        <img loading="lazy" src="${esc(e?.thumb || bannerOf(m))}" alt="">
        ${m.duration ? `<span class="ep-dur">${m.duration}m</span>` : ''}
        ${!done && n === cur + 1 ? '<span class="ep-flag">Up next</span>' : ''}
      </a>
      <div class="ep-body">
        <span class="ep-n">Episode ${n}</span>
        <a class="ep-t" href="${href}"><span>${esc(e?.title || 'Episode ' + n)}</span></a>
      </div>
      <a class="ep-num" href="${href}">${n}</a>
      <div class="ep-foot">
        <a class="ep-chip" data-l="sub" href="${href}&lang=sub" title="Preview with subtitles"><b>SUB</b><i>${icon('play', 8)}</i></a>
        <a class="ep-chip" data-l="dub" href="${href}&lang=dub" title="Preview dubbed"><b>DUB</b><i>${icon('play', 8)}</i></a>
        <span class="ep-state" title="${done ? 'Watched' : 'Not watched yet'}">${done ? icon('check', 10) : ''}</span>
      </div>
    </article>`;
  }).join('')}</div>` : '<p class="empty">No episodes match.</p>';
}

document.addEventListener('DOMContentLoaded', initAnime);
