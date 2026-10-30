/* Browse page: search and filters, abortable requests, next-page prefetch, URL kept in sync */
const DEFAULT_SORT = 'POPULARITY_DESC';
const paramsOf = st => {
  const q = new URLSearchParams();
  const sort = st.sort && st.sort !== (st.q ? 'SEARCH_MATCH' : DEFAULT_SORT) ? st.sort : '';
  Object.entries({ q: st.q, format: st.format, status: st.status, season: st.season, year: st.year,
    sort, genre: (st.genres || []).join(',') }).forEach(([k, v]) => { if (v) q.set(k, v); });
  return q;
};
const hasFilters = st => !!(st && paramsOf(st).toString());

let P = new URLSearchParams(location.search), restored = false;
if (!location.search) {                                   // Remember filters between visits
  const last = jget('as_browse_last', null);
  if (hasFilters(last)) { P = paramsOf(last); restored = true; }
}
let page = Math.max(1, Number(P.get('page')) || 1);
let selectedGenres = P.get('genre') ? P.get('genre').split(',').filter(g => g && visibleGenres().includes(g)) : [];
let browseCtrl = null, firstLoad = true, userSort = !!P.get('sort');

const defaultSort = () => $('#f-q').value.trim() ? 'SEARCH_MATCH' : DEFAULT_SORT;   // Typing a title ranks by relevance
const getState = () => ({ q: $('#f-q').value.trim(), format: $('#f-format').value, status: $('#f-status').value,
  season: $('#f-season').value, year: $('#f-year').value, sort: $('#f-sort').value, genres: [...selectedGenres] });

function applyState(st) {
  $('#f-q').value = st.q || ''; $('#f-format').value = st.format || ''; $('#f-status').value = st.status || '';
  $('#f-season').value = st.season || ''; $('#f-year').value = st.year || '';
  $('#f-sort').value = st.sort || defaultSort(); userSort = !!st.sort && st.sort !== defaultSort();
  selectedGenres = [...(st.genres || [])]; paintGenres();
  page = 1; load();
}

/* Every page shows exactly 32 titles */
const PAGE_SIZE = 32;
function fitPerPage() { PER_PAGE = PAGE_SIZE; }

/* Dropdowns: the native select list has an outline CSS cannot remove, so selects are re-skinned as .dd lists; the hidden <select> stays the source of truth */
const DD_CHEV = '<svg class="dd-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const DD_TICK = '<svg class="dd-tick" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const isSheet = () => innerWidth <= 640;                                         // Phones get a bottom sheet

function ddSetOpen(root, on) {
  if (on) $$('.dd.open').forEach(r => r !== root && ddSetOpen(r, false));
  root.classList.toggle('open', on);
  $('.dd-btn', root).setAttribute('aria-expanded', String(on));
  $('#dd-back').classList.toggle('open', !!$('.dd.open'));
  if (!on) return;
  const pop = $('.dd-pop', root);
  pop.style.left = pop.style.right = '';                                          // Keep the list on screen near the right edge
  if (!isSheet() && pop.getBoundingClientRect().right > innerWidth - 12) { pop.style.left = 'auto'; pop.style.right = '0'; }
}
const ddCloseAll = () => $$('.dd.open').forEach(r => ddSetOpen(r, false));

function enhanceSelect(sel) {
  const root = document.createElement('div');
  root.className = 'dd dd-select';
  root.innerHTML = `<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="dd-label"></span>${DD_CHEV}</button>
    <div class="dd-pop" role="listbox"><div class="dd-list"></div></div>`;
  sel.hidden = true; sel.after(root);
  const btn = $('.dd-btn', root), pop = $('.dd-pop', root), list = $('.dd-list', root);

  const sync = () => {
    $('.dd-label', root).textContent = sel.selectedOptions[0]?.textContent || '';
    $$('.dd-opt', list).forEach(o => { const on = o.dataset.v === sel.value; o.classList.toggle('on', on); o.setAttribute('aria-selected', on); });
  };
  const build = () => {                                                           // Built on open so late options (years) are included
    list.innerHTML = [...sel.options].map(o =>
      `<button type="button" class="dd-opt" role="option" data-v="${esc(o.value)}"><span>${esc(o.textContent)}</span>${DD_TICK}</button>`).join('');
    sync();
  };
  // Mirror code-set select values into the button text
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(sel, 'value', { configurable: true, get() { return d.get.call(sel); }, set(v) { d.set.call(sel, v); sync(); } });

  const open = () => {
    build(); ddSetOpen(root, true);
    const on = $('.dd-opt.on', list) || $('.dd-opt', list);
    if (on) { list.scrollTop = Math.max(0, on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2); on.focus({ preventScroll: true }); }
  };
  const close = (refocus) => { ddSetOpen(root, false); if (refocus) btn.focus({ preventScroll: true }); };
  const choose = o => {
    const changed = sel.value !== o.dataset.v;
    sel.value = o.dataset.v; close(true);
    if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
  };

  btn.addEventListener('click', () => root.classList.contains('open') ? close() : open());
  btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
  list.addEventListener('click', e => { const o = e.target.closest('.dd-opt'); if (o) choose(o); });
  list.addEventListener('keydown', e => {
    const opts = $$('.dd-opt', list), i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); opts[Math.max(0, i - 1)]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); opts[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); opts[opts.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
  });
  sync();
}

/* Genre picker: multi-select with search; rebuilt on open because Hentai / Erotica depend on the 18+ setting */
const reloadGenres = debounce(() => { page = 1; load(); }, 160);                // Several quick picks make one request
let genreFilter = '';
function genreLabel() {
  const n = selectedGenres.length;
  return !n ? 'Genres' : n === 1 ? selectedGenres[0] : `${selectedGenres[0]} +${n - 1}`;
}
function paintGenres() {
  $('#f-genre-label').textContent = genreLabel();
  $('#f-genre-btn').classList.toggle('set', selectedGenres.length > 0);
  $('#f-genre-count').textContent = selectedGenres.length ? `${selectedGenres.length} selected` : 'Pick one or more';
  $('#f-genre-clear').hidden = !selectedGenres.length;
  $$('#f-genre-list .dd-opt').forEach(o => {
    const on = selectedGenres.includes(o.dataset.g);
    o.classList.toggle('on', on); o.setAttribute('aria-selected', on);
  });
}
function renderGenreList() {
  const q = genreFilter.trim().toLowerCase();
  const shown = visibleGenres().filter(g => g.toLowerCase().includes(q));
  $('#f-genre-list').innerHTML = shown.length
    ? shown.map(g => `<button type="button" class="dd-opt dd-check" role="option" data-g="${esc(g)}"><i class="dd-box">${DD_TICK}</i><span>${esc(g)}</span></button>`).join('')
    : '<p class="dd-none">No genre found</p>';
  paintGenres();
}
function toggleGenre(g) {
  const i = selectedGenres.indexOf(g);
  if (i > -1) selectedGenres.splice(i, 1); else selectedGenres.push(g);
  paintGenres();
  $('#results').classList.add('is-loading'); $('#result-count').textContent = 'Loading...';   // React instantly, fetch a beat later
  reloadGenres();
}
function initGenrePicker() {
  const root = $('#f-genre'), btn = $('#f-genre-btn'), list = $('#f-genre-list'), q = $('#f-genre-q');
  const open = () => {
    genreFilter = ''; q.value = ''; renderGenreList(); ddSetOpen(root, true);
    if (!isSheet()) q.focus({ preventScroll: true });                             // No auto-keyboard on phones
  };
  const close = refocus => { ddSetOpen(root, false); if (refocus) btn.focus({ preventScroll: true }); };

  btn.addEventListener('click', () => root.classList.contains('open') ? close() : open());
  btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } });
  list.addEventListener('click', e => { const o = e.target.closest('.dd-opt'); if (o) toggleGenre(o.dataset.g); });   // Stays open for multiple picks
  q.addEventListener('input', () => { genreFilter = q.value; renderGenreList(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); $('.dd-opt', list)?.focus(); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = $('.dd-opt', list); if (o) toggleGenre(o.dataset.g); }   // Enter picks the top match
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
  });
  root.addEventListener('keydown', e => {
    if (e.target === q || e.target === btn) return;
    const opts = $$('.dd-opt', list), i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? q.focus() : opts[i - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
  });
  $('#f-genre-clear').onclick = () => {
    if (!selectedGenres.length) return;
    selectedGenres = []; paintGenres();
    $('#results').classList.add('is-loading'); $('#result-count').textContent = 'Loading...';
    reloadGenres();
  };
  paintGenres();
}

function initBrowse() {
  wireHeadFade();
  fitPerPage();
  const y = $('#f-year'), thisYear = new Date().getFullYear();
  y.innerHTML += Array.from({ length: thisYear + 2 - 1960 + 1 }, (_, i) =>
    `<option value="${thisYear + 2 - i}">${thisYear + 2 - i}</option>`).join('');

  ['f-format', 'f-status', 'f-season', 'f-year', 'f-sort'].forEach(id => enhanceSelect($('#' + id)));
  initGenrePicker();
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) ddCloseAll(); });   // Click outside or on the backdrop closes
  document.addEventListener('keydown', e => { if (e.key === 'Escape') ddCloseAll(); });

  $('#f-q').value = P.get('q') || '';
  $('#f-format').value = P.get('format') || '';
  $('#f-status').value = P.get('status') || '';
  $('#f-sort').value = P.get('sort') || defaultSort();
  if (P.get('season') === 'now') {
    const s = currentSeason();
    $('#f-season').value = s.season; $('#f-year').value = s.year;
  } else {
    $('#f-season').value = P.get('season') || '';
    $('#f-year').value = P.get('year') || '';
  }

  const reload = debounce(() => { page = 1; load(); }, 200);
  $('#f-q').addEventListener('input', () => {
    const sort = $('#f-sort');
    if (!userSort) sort.value = defaultSort();                                  // Best match while typing a title
    else if (!$('#f-q').value.trim() && sort.value === 'SEARCH_MATCH') { sort.value = DEFAULT_SORT; userSort = false; }
    reload();
  });
  ['f-format', 'f-status', 'f-season', 'f-year', 'f-sort'].forEach(id =>
    $('#' + id).addEventListener('change', () => { if (id === 'f-sort') userSort = true; page = 1; load(); }));

  $('#f-clear').onclick = () => {
    selectedGenres = []; paintGenres();
    ['f-q', 'f-format', 'f-status', 'f-season', 'f-year'].forEach(id => $('#' + id).value = '');
    userSort = false; $('#f-sort').value = DEFAULT_SORT;
    page = 1; load();
  };

  $('#rand-btn').onclick = e => randomAnime(e.currentTarget);

  load();
  if (restored) toast('Restored your last filters. Press Clear to reset.');
}

/* "Latest episodes" is not an AniList sort; it lists recently aired episodes (Api.latestAired) */
const isLatest = () => $('#f-sort').value === 'LATEST_EPISODES';
const fetchBrowse = (vars, pg, opts) => [].concat(vars.sort || [])[0] === 'LATEST_EPISODES' ? Api.latestAired(vars, pg, opts) : Api.browseDeep(vars, pg, opts);

function browseVars(pg, genres = selectedGenres) {
  return {
    page: pg,
    perPage: PER_PAGE,
    search: $('#f-q').value.trim() || undefined,
    genres: genres.length ? genres : undefined,
    format: $('#f-format').value || undefined,
    status: $('#f-status').value || undefined,
    season: $('#f-season').value || undefined,
    year: $('#f-year').value ? Number($('#f-year').value) : undefined,
    sort: [$('#f-sort').value === 'SEARCH_MATCH' && !$('#f-q').value.trim() ? DEFAULT_SORT : $('#f-sort').value],
  };
}

function syncURL() {
  const q = paramsOf(getState());
  if (page > 1) q.set('page', page);
  history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
  jset('as_browse_last', getState());                // Remembered for the next visit
}

/* Result count: exact under 5000; popularity sorts get the exact total from Api.browseDeep, other sorts wait for Api.browseTotal */
let PER_PAGE = 32;
const COUNT_AT = 5000;
let countCtrl = null, countTimer = 0, countToken = 0;
const nTitles = n => `${n.toLocaleString()} ${n === 1 ? 'title' : 'titles'} found`;
function showCount(pageInfo, vars) {
  clearTimeout(countTimer);
  if (countCtrl) countCtrl.abort();
  const token = ++countToken, el = $('#result-count'), total = pageInfo.total || 0;
  if (!total) { el.textContent = 'No results'; return; }
  if (pageInfo.deep) { el.textContent = nTitles(total); return; }          // browseDeep already counted the ranges: exact and fully reachable
  if (total < COUNT_AT) { el.textContent = nTitles(total); return; }
  el.textContent = 'Loading...';                                          // No "5,000+" guess: wait for the real number
  countTimer = setTimeout(async () => {                                   // Debounce so typing does not count on every keystroke
    const ctrl = countCtrl = new AbortController();
    try {
      const { total: exact, approx } = await Api.browseTotal(
        { search: vars.search, genres: vars.genres, format: vars.format, status: vars.status, season: vars.season, year: vars.year },
        { signal: ctrl.signal });
      if (token !== countToken) return;
      // AniList pages only the first 5000, but a host reporting a larger lastPage has no such limit
      const reachable = (pageInfo.lastPage || 0) * PER_PAGE;
      const reach = Math.min(exact, reachable > COUNT_AT + PER_PAGE ? Infinity : COUNT_AT, reachable);
      el.textContent = (approx ? 'About ' : '') + nTitles(exact) +
        (reach && exact > reach ? ` \u00b7 showing the first ${reach.toLocaleString()}, add filters to narrow it down` : '');
    } catch (err) {
      if (token === countToken && err?.name !== 'AbortError') el.textContent = `${total.toLocaleString()}+ titles found`;   // Counting failed: show the capped number
    }
  }, 250);
}

/* Saved or restored filters silently narrow a title search; say so and offer to drop them */
function updateFilterHint(empty) {
  const el = $('#filter-hint'), st = getState();
  const on = [st.format && 'type', st.status && 'status', st.season && 'season', st.year && 'year', st.genres.length && 'genre'].filter(Boolean);
  if (!on.length || !(st.q || empty)) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `Filtering by ${on.join(', ')}, so some titles may be hidden. <button class="btn-link" id="drop-filters">Clear filters</button>`;
  $('#drop-filters').onclick = () => {
    selectedGenres = []; paintGenres();
    ['f-format', 'f-status', 'f-season', 'f-year'].forEach(id => $('#' + id).value = '');
    page = 1; load();
  };
}

/* Pager: Prev / Next. Hovering or touching Next starts loading that page early, so the click usually finds it ready */
function paintPager(pageInfo) {
  $('#pager').innerHTML = pageInfo.lastPage > 1 ? `
    <button id="pg-prev" ${pageInfo.currentPage === 1 ? 'disabled' : ''}>&lsaquo; Prev</button>
    <span class="muted">Page ${pageInfo.currentPage} of ${pageInfo.lastPage}</span>
    <button id="pg-next" ${!pageInfo.hasNextPage ? 'disabled' : ''}>Next &rsaquo;</button>` : '';
  if ($('#pg-prev')) $('#pg-prev').onclick = () => { page--; load(); scrollTo(0, 0); };
  const next = $('#pg-next');
  if (next) {
    next.onclick = () => { page++; load(); scrollTo(0, 0); };
    const warm = () => fetchBrowse(browseVars(page + 1), page + 1, { lazy: true }).catch(() => {});
    next.addEventListener('pointerenter', warm, { once: true });
    next.addEventListener('touchstart', warm, { once: true, passive: true });
  }
}
function prefetchNext(ctrl, pageInfo) {
  if (!pageInfo.hasNextPage) return;
  const idle = window.requestIdleCallback ? fn => requestIdleCallback(fn, { timeout: 500 }) : fn => setTimeout(fn, 300);
  idle(() => { if (ctrl === browseCtrl) fetchBrowse(browseVars(page + 1), page + 1, { lazy: true }).catch(() => {}); });
}
/* Popularity listings that hit AniList's 5000 cap: count the rest in the background, then fix the count and the page total */
function countCapped(ctrl, pageInfo, vars) {
  clearTimeout(countTimer); if (countCtrl) countCtrl.abort();
  const token = ++countToken, el = $('#result-count');
  el.textContent = 'Counting...';
  Api.deepInfo(vars, pageInfo.currentPage).then(info => {
    if (ctrl !== browseCtrl || token !== countToken) return;
    showCount(info, vars);
    paintPager({ ...pageInfo, ...info, hasNextPage: info.hasNextPage });
    prefetchNext(ctrl, info);
  }).catch(err => {
    if (err?.name === 'AbortError' || ctrl !== browseCtrl || token !== countToken) return;
    showCount(pageInfo, vars);                                                  // Counting failed: fall back to the older count
  });
}

async function load() {
  if (browseCtrl) browseCtrl.abort();             // Drop the stale request
  const ctrl = browseCtrl = new AbortController();
  const box = $('#results');
  syncURL();

  if (firstLoad) box.innerHTML = skeletonGrid(PER_PAGE);  // Later loads keep the old grid, dimmed
  else { box.style.minHeight = box.offsetHeight + 'px'; box.classList.add('is-loading'); }   // Hold the height so the page does not jump
  clearTimeout(countTimer); if (countCtrl) countCtrl.abort(); countToken++;
  $('#result-count').textContent = 'Loading...';

  try {
    const data = await fetchBrowse(browseVars(page), page, { signal: ctrl.signal });
    if (ctrl !== browseCtrl) return;
    firstLoad = false;

    const { media, pageInfo } = data.Page;
    if (pageInfo.latest) {
      clearTimeout(countTimer); if (countCtrl) countCtrl.abort(); countToken++;
      $('#result-count').textContent = 'Newest episodes first \u00b7 aired in the last 7 days';
      LATEST_CTX = { seen: Store.seen(), prog: Store.progress() };
      box.innerHTML = media.length
        ? `<div class="grid">${media.map(m => latestCardHTML({ m, ep: m.__ep, at: m.__at })).join('')}</div>`
        : '<p class="empty">No episodes matched those filters.</p>';
    } else {
      if (pageInfo.capped) countCapped(ctrl, pageInfo, browseVars(page));            // Exact total arrives a moment later, without holding up the page
      else showCount(pageInfo, browseVars(page));
      box.innerHTML = gridHTML(media, 'No anime matched those filters.');
    }
    updateFilterHint(!media.length);
    box.classList.remove('is-loading'); box.style.minHeight = '';
    Reveal.watch(box, '.card');

    paintPager(pageInfo);
    prefetchNext(ctrl, pageInfo);
  } catch (err) {
    if (err.name === 'AbortError' || ctrl !== browseCtrl) return;
    box.classList.remove('is-loading'); box.style.minHeight = '';
    box.innerHTML = `<p class="empty">${esc(err.message)}<br><br><button class="btn btn-primary" id="retry-btn">Try again</button></p>`;
    $('#retry-btn').onclick = () => load();
    $('#pager').innerHTML = '';
    $('#result-count').textContent = 'Could not load';
  }
}

document.addEventListener('DOMContentLoaded', initBrowse);
