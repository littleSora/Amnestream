const Mal = (() => {
  const KEY = 'as_mal', PEND = 'as_mal_pending';
  const cfg = () => window.AS_CONFIG || {};
  const api = () => (cfg().malApi || '/api').replace(/\/$/, '');
  const CID = 'as_mal_cid';
  let cid = cfg().malClientId || (() => { try { return localStorage.getItem(CID) || ''; } catch { return ''; } })();
  const ready = (async () => {
    if (cfg().malClientId) return;
    try {
      const r = await fetch(api() + '/config', { cache: 'no-store' });
      const d = r.ok ? await r.json() : null;
      if (d && typeof d.malClientId === 'string') { cid = d.malClientId.trim(); try { cid ? localStorage.setItem(CID, cid) : localStorage.removeItem(CID); } catch { } }
    } catch { }
  })();
  const rd = () => jget(KEY, null);
  const redirectUri = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'settings.html';   // Must match the redirect URL registered at MAL exactly
  const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
  const STATUS = [['watching', 'Watching'], ['completed', 'Completed'], ['on_hold', 'On hold'], ['dropped', 'Dropped'], ['plan_to_watch', 'Plan to watch']];
  const done = new Set();
  /* MyAnimeList sends the watched count as num_episodes_watched (it only takes num_watched_episodes when saving) */
  const watchedOf = l => Number(l && (l.num_episodes_watched ?? l.num_watched_episodes)) || 0;

  async function post(path, body, headers = {}) {
    const r = await fetch(api() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    let data = null; try { data = await r.json(); } catch { }
    return { ok: r.ok, status: r.status, data };
  }
  async function tokenCall(body) {
    await ready;
    const r = await post('/mal-token', { ...body, client_id: cid });
    if (!r.ok || !r.data || !r.data.access_token) throw new Error((r.data && (r.data.message || r.data.hint || r.data.error)) || 'MyAnimeList said no (' + r.status + ')');
    return r.data;
  }
  const store = (t, extra) => jset(KEY, { ...(rd() || {}), ...extra, access: t.access_token, refresh: t.refresh_token || (rd() || {}).refresh, exp: Date.now() + (Number(t.expires_in) || 3600) * 1000 });

  async function token() {
    const s = rd(); if (!s) return null;
    if (s.exp - Date.now() > 60e3) return s.access;
    try { const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: s.refresh }); store(t); return t.access_token; }
    catch { Mal.disconnect(); return null; }
  }
  /* One MAL API call through the proxy. path like /v2/anime/123/my_list_status */
  async function call(method, path, { query, form } = {}) {
    let tk = await token(); if (!tk) throw new Error('Log in to MyAnimeList again');
    let r = await post('/mal', { method, path, query, form }, { 'X-MAL-Token': tk });
    if (r.status === 401) { const s = rd(); if (s) { s.exp = 0; jset(KEY, s); } tk = await token(); if (!tk) throw new Error('Log in to MyAnimeList again'); r = await post('/mal', { method, path, query, form }, { 'X-MAL-Token': tk }); }
    if (!r.ok) throw new Error((r.data && (r.data.message || r.data.error)) || 'MyAnimeList error ' + r.status);
    return r.data;
  }

  const Mal = {
    STATUS,
    ready,
    configured: () => !!cid,
    connected: () => !!rd(),
    me: () => { const s = rd(); return s ? { name: s.name || 'your MAL account', picture: s.picture || '' } : null; },
    /* Automatic updates are on: connected, "Update MAL automatically", and not Incognito */
    active: () => Mal.connected() && !!Settings.get().malAuto && !Settings.get().incognito,

    async connect() {
      await ready;
      if (!Mal.configured()) { toast('MyAnimeList is not set up on this site yet'); return; }
      const verifier = rand(64), state = rand(16);
      jset(PEND, { verifier, state, at: Date.now() });
      const q = new URLSearchParams({ response_type: 'code', client_id: cid, code_challenge: verifier, code_challenge_method: 'plain', state, redirect_uri: redirectUri() });
      location.href = 'https://myanimelist.net/v1/oauth2/authorize?' + q;
    },
    /* Run on the page MAL sends the person back to (settings.html?code=...). Resolves { name } when it connected, null when there was nothing to do. */
    async finishLogin() {
      const p = new URLSearchParams(location.search), code = p.get('code'), state = p.get('state'), err = p.get('error');
      if (!code && !err) return null;
      const pend = jget(PEND, null); localStorage.removeItem(PEND);
      history.replaceState(null, '', 'settings.html?s=you');
      if (err) throw new Error(err === 'access_denied' ? 'MyAnimeList login was cancelled' : 'MyAnimeList login failed: ' + err);
      if (!pend || pend.state !== state || Date.now() - pend.at > 15 * 60e3) throw new Error('That MyAnimeList login expired. Try Connect again.');
      const t = await tokenCall({ grant_type: 'authorization_code', code, code_verifier: pend.verifier, redirect_uri: redirectUri() });
      store(t, { name: '', picture: '' });
      let who = null; try { who = await call('GET', '/v2/users/@me'); } catch { }
      jset(KEY, { ...rd(), name: (who && who.name) || '', picture: (who && who.picture) || '' });
      return { name: (who && who.name) || 'MyAnimeList' };
    },
    disconnect() { localStorage.removeItem(KEY); localStorage.removeItem(PEND); done.clear(); },

    /* This anime on your MAL list: { status, score, num_watched_episodes } or null when it is not on the list. Also the total episodes MAL knows. */
    async entry(idMal) {
      const d = await call('GET', '/v2/anime/' + Number(idMal), { query: { fields: 'my_list_status,num_episodes' } });
      return { list: d.my_list_status || null, total: d.num_episodes || 0 };
    },
    save(idMal, f) { return call('PATCH', '/v2/anime/' + Number(idMal) + '/my_list_status', { form: f }); },
    remove(idMal) { return call('DELETE', '/v2/anime/' + Number(idMal) + '/my_list_status'); },

    /* An episode was finished here: raise "episodes watched" on MAL (never lowers it) and set Watching / Completed. Quiet unless it changed something. */
    async track(media, ep) {
      if (!media || !media.idMal || !Mal.active()) return;
      ep = Number(ep); const k = media.idMal + ':' + ep; if (done.has(k)) return; done.add(k);
      try {
        const { list, total: t } = await Mal.entry(media.idMal);
        const total = t || media.episodes || 0;
        if (list && watchedOf(list) >= ep) return;
        const status = total && ep >= total ? 'completed' : 'watching';
        await Mal.save(media.idMal, { status, num_watched_episodes: ep });
        toast(status === 'completed' ? 'MyAnimeList: marked as completed' : 'MyAnimeList: episode ' + ep + ' saved');
      } catch (e) { done.delete(k); if (!/log in/i.test(e.message)) console.warn('MAL update failed:', e.message); else toast(e.message); }
    },

    /* Details page: the button next to Share opens this dialog to set status, score, episodes, rewatches and notes by hand */
    async open(media) {
      await ready;
      if (!Mal.configured()) { toast('MyAnimeList is not set up on this site yet'); return; }
      const ttl = titleOf(media), cover = (media.coverImage && (media.coverImage.large || media.coverImage.extraLarge)) || '', art = media.bannerImage || cover;
      const chips = [media.format ? String(media.format).replace(/_/g, ' ') : '', media.episodes ? media.episodes + ' episodes' : ''].filter(Boolean);
      const hero = `<div class="mal-hero">
          <span class="mal-hero-bg" style="background-image:url('${esc(art)}')"></span>
          <button type="button" class="um-x" data-um-close aria-label="Close">${icon('close', 16)}</button>
          <div class="mal-hero-in">
            ${cover ? `<img class="mal-cover" src="${esc(cover)}" alt="">` : ''}
            <div class="mal-hero-t"><span class="mal-tag">MAL</span><h2>${esc(ttl)}</h2>
              <div class="mal-chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div></div>
          </div></div>`;
      const m = UiModal.open({ cls: 'um-mal', html: hero + '<div class="mal-body"><p class="mal-note"><span class="spinner"></span>Loading your list...</p></div>' });
      const body = $('.mal-body', m.el);
      const note = msg => { body.innerHTML = msg; };

      if (!Mal.connected()) {
        note(`<div class="mal-empty"><p>Connect your MyAnimeList account to track this anime from here.</p>
          <a class="dp-btn primary" href="settings.html?s=you">Connect MyAnimeList</a></div>`);
        return;
      }
      let e;
      try { e = await Mal.entry(media.idMal); }
      catch (x) { note(`<div class="mal-empty"><p>${esc(x.message)}</p><button type="button" class="dp-btn" data-um-close>Close</button></div>`); $$('[data-um-close]', body).forEach(b => b.onclick = () => m.close()); return; }
      if (!m.el.isConnected) return;

      const total = e.total || media.episodes || 0;
      const paint = list => {
        const cur = list || {}, who = Mal.me();
        body.innerHTML = `
          <div class="mal-grid">
            <label class="mal-f"><span>Status</span>
              <select id="mal-st"><option value="">Not on my list</option>${STATUS.map(([v, n]) => `<option value="${v}" ${cur.status === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="mal-f"><span>Score</span>
              <select id="mal-sc"><option value="0">No score</option>${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => `<option value="${n}" ${cur.score === n ? 'selected' : ''}>${n}${['', ' - Appalling', ' - Horrible', ' - Very bad', ' - Bad', ' - Average', ' - Fine', ' - Good', ' - Very good', ' - Great', ' - Masterpiece'][n]}</option>`).join('')}</select></label>
            <div class="mal-f"><span>Episode progress</span>
              <div class="mal-step">
                <button type="button" id="mal-m" aria-label="One episode less">${icon('minus', 14)}</button>
                <input id="mal-ep" type="number" min="0" ${total ? `max="${total}"` : ''} value="${watchedOf(cur)}" inputmode="numeric" aria-label="Episodes watched">
                <button type="button" id="mal-p" aria-label="One episode more">${icon('plus', 14)}</button>
                <small>/ ${total || '?'}</small>
              </div></div>
            <label class="mal-f"><span>Total rewatches</span>
              <input id="mal-rw" type="number" min="0" max="999" value="${cur.num_times_rewatched || 0}" inputmode="numeric"></label>
            <label class="mal-f wide"><span>Notes</span>
              <textarea id="mal-cm" rows="3" maxlength="500" placeholder="Share your thoughts">${esc(cur.comments || '')}</textarea></label>
          </div>
          <p class="mal-acct">${icon('link', 13)}<span>Saved to ${esc(who ? who.name : 'your MyAnimeList')}</span><a href="settings.html?s=you">Manage</a></p>
          <div class="mal-foot">
            ${list ? '<button type="button" class="dp-btn danger-o" id="mal-del">Remove</button>' : '<span></span>'}
            <span class="mal-foot-r"><button type="button" class="dp-btn" data-um-close>Cancel</button><button type="button" class="dp-btn primary" id="mal-save">Save</button></span>
          </div>`;
        const st = $('#mal-st', body), ep = $('#mal-ep', body), sc = $('#mal-sc', body), rw = $('#mal-rw', body), cm = $('#mal-cm', body);
        const clampEp = () => Math.max(0, Math.min(total || 9999, Math.floor(Number(ep.value)) || 0));
        const sync = () => {
          ep.value = clampEp();
          if (total && Number(ep.value) >= total && st.value && st.value !== 'completed') st.value = 'completed';
        };
        st.onchange = () => { if (st.value === 'completed' && total) ep.value = total; };
        ep.onchange = sync;
        $('#mal-m', body).onclick = () => { ep.value = Math.max(0, clampEp() - 1); };
        $('#mal-p', body).onclick = () => { ep.value = clampEp() + 1; sync(); };
        $$('[data-um-close]', body).forEach(b => b.onclick = () => m.close());

        $('#mal-save', body).onclick = async ev => {
          const b = ev.currentTarget;
          if (!st.value) { toast('Pick a status first'); st.focus(); return; }
          b.disabled = true; b.textContent = 'Saving...';
          try {
            const r = await Mal.save(media.idMal, {
              status: st.value, num_watched_episodes: clampEp(), score: Number(sc.value) || 0,
              num_times_rewatched: Math.max(0, Math.min(999, Math.floor(Number(rw.value)) || 0)), comments: cm.value.slice(0, 500),
            });
            toast('Saved to MyAnimeList');
            Mal._onChange && Mal._onChange(r);
            m.close();
          } catch (x) { toast(x.message); b.disabled = false; b.textContent = 'Save'; }
        };
        const del = $('#mal-del', body);
        if (del) del.onclick = async () => {
          if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Tap again to remove'; setTimeout(() => { if (del.isConnected) { del.classList.remove('arm'); del.textContent = 'Remove'; } }, 3500); return; }
          del.disabled = true;
          try { await Mal.remove(media.idMal); toast('Removed from MyAnimeList'); Mal._onChange && Mal._onChange(null); m.close(); }
          catch (x) { toast(x.message); del.disabled = false; }
        };
      };
      paint(e.list || null);
    },
  };
  return Mal;
})();
