/* MyAnimeList: log in with MAL and keep your MAL list in step with what you watch.
   Login is OAuth 2 with PKCE (no secret in the browser). MAL's servers do not allow browsers to call them directly (no CORS), so the token exchange and
   the few API calls we make go through two tiny serverless functions in /api (api/mal-token.js and api/mal.js, made for Vercel).
   Setup: see "MyAnimeList" in README.md. The client ID comes from the MAL_CLIENT_ID environment variable on Vercel (served by api/config.js);
   window.AS_CONFIG.malClientId in js/config.js still works as an override. */
const Mal = (() => {
  const KEY = 'as_mal', PEND = 'as_mal_pending';
  const cfg = () => window.AS_CONFIG || {};
  const api = () => (cfg().malApi || '/api').replace(/\/$/, '');
  /* The client ID is public, but it is kept in Vercel (MAL_CLIENT_ID) so it stays out of the repo. It is fetched once, remembered in this browser, and refreshed on every visit. */
  const CID = 'as_mal_cid';
  let cid = cfg().malClientId || (() => { try { return localStorage.getItem(CID) || ''; } catch { return ''; } })();
  const ready = (async () => {
    if (cfg().malClientId) return;
    try {
      const r = await fetch(api() + '/config', { cache: 'no-store' });
      const d = r.ok ? await r.json() : null;
      if (d && typeof d.malClientId === 'string') { cid = d.malClientId.trim(); try { cid ? localStorage.setItem(CID, cid) : localStorage.removeItem(CID); } catch { /* storage blocked */ } }
    } catch { /* offline, or no /api (local preview): keep the remembered ID */ }
  })();
  const rd = () => jget(KEY, null);
  const redirectUri = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'settings.html';   // Must match the redirect URL registered at MAL exactly
  const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const rand = n => b64u(crypto.getRandomValues(new Uint8Array(n)));
  const STATUS = [['watching', 'Watching'], ['completed', 'Completed'], ['on_hold', 'On hold'], ['dropped', 'Dropped'], ['plan_to_watch', 'Plan to watch']];
  const done = new Set();                                                   // "id:ep" already sent this visit

  async function post(path, body, headers = {}) {
    const r = await fetch(api() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    let data = null; try { data = await r.json(); } catch { /* empty body */ }
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
    catch { Mal.disconnect(); return null; }                              // Refresh failed: the login expired or was revoked
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
    ready,                                                                 // Resolves once the client ID has been looked up
    configured: () => !!cid,
    connected: () => !!rd(),
    me: () => { const s = rd(); return s ? { name: s.name || 'your MAL account', picture: s.picture || '' } : null; },
    /* Automatic updates are on: connected, "Update MAL automatically", and not Incognito */
    active: () => Mal.connected() && !!Settings.get().malAuto && !Settings.get().incognito,

    async connect() {
      await ready;
      if (!Mal.configured()) { toast('MyAnimeList is not set up on this site yet'); return; }
      const verifier = rand(64), state = rand(16);                          // MAL only supports the "plain" PKCE method: the challenge is the verifier
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
      let who = null; try { who = await call('GET', '/v2/users/@me'); } catch { /* the login still worked */ }
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
        if (list && list.num_watched_episodes >= ep) return;                // Already at or past this episode on MAL
        const status = total && ep >= total ? 'completed' : 'watching';
        await Mal.save(media.idMal, { status, num_watched_episodes: ep });
        toast(status === 'completed' ? 'MyAnimeList: marked as completed' : 'MyAnimeList: episode ' + ep + ' saved');
      } catch (e) { done.delete(k); if (!/log in/i.test(e.message)) console.warn('MAL update failed:', e.message); else toast(e.message); }
    },

    /* Details page: a small panel to set status, episodes and score by hand */
    async panel(box, media) {
      if (!box) return;
      await ready;
      if (!Mal.configured()) return;                                         // Not set up: nothing to show
      box.hidden = false;
      if (!Mal.connected()) { box.innerHTML = `<span class="mal-tag">MAL</span><span class="mal-txt">Track this on MyAnimeList</span><a class="dp-btn sm" href="settings.html?s=you">Connect</a>`; return; }
      box.innerHTML = `<span class="mal-tag">MAL</span><span class="mal-txt">Loading your list...</span>`;
      let e; try { e = await Mal.entry(media.idMal); } catch (x) { box.innerHTML = `<span class="mal-tag">MAL</span><span class="mal-txt">${esc(x.message)}</span>`; return; }
      const total = e.total || media.episodes || 0, l = e.list || {};
      const paint = list => {
        const cur = list || {};
        box.innerHTML = `<span class="mal-tag">MAL</span>
          <label>Status<select id="mal-st"><option value="">Not on my list</option>${STATUS.map(([v, n]) => `<option value="${v}" ${cur.status === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label>Episodes<span class="mal-eps"><input id="mal-ep" type="number" min="0" ${total ? `max="${total}"` : ''} value="${cur.num_watched_episodes || 0}" inputmode="numeric"> <small>/ ${total || '?'}</small></span></label>
          <label>Score<select id="mal-sc"><option value="0">-</option>${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => `<option value="${n}" ${cur.score === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="dp-btn primary sm" id="mal-save">Save</button>${list ? '<button class="dp-btn sm" id="mal-del" title="Remove from my MAL list">Remove</button>' : ''}`;
        const st = $('#mal-st', box), ep = $('#mal-ep', box);
        st.onchange = () => { if (st.value === 'completed' && total) ep.value = total; };
        ep.oninput = () => { if (total && Number(ep.value) >= total && st.value !== 'completed' && st.value !== '') st.value = 'completed'; };
        $('#mal-save', box).onclick = async ev => {
          const b = ev.currentTarget; if (!st.value) { toast('Pick a status first'); return; }
          b.disabled = true;
          try {
            const n = Math.max(0, Math.min(total || 9999, Number(ep.value) || 0));
            const r = await Mal.save(media.idMal, { status: st.value, num_watched_episodes: n, score: Number($('#mal-sc', box).value) || 0 });
            toast('Saved to MyAnimeList'); paint(r);
          } catch (x) { toast(x.message); b.disabled = false; }
        };
        const del = $('#mal-del', box);
        if (del) del.onclick = async () => { if (!confirm('Remove this anime from your MyAnimeList list?')) return; try { await Mal.remove(media.idMal); toast('Removed from MyAnimeList'); paint(null); } catch (x) { toast(x.message); } };
      };
      paint(e.list ? l : null);
    },
  };
  return Mal;
})();
