const Comments = {
  PAGE: 15, MAX: 1000,
  _base: () => `${window.AS_CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/comments`,
  _head: extra => ({ apikey: window.AS_CONFIG.supabaseAnonKey, Authorization: 'Bearer ' + window.AS_CONFIG.supabaseAnonKey, ...extra }),
  ready: () => typeof Auth !== 'undefined' && Auth.configured(),

  _ep: ep => (ep == null ? 'episode=is.null' : `episode=eq.${Number(ep)}`),                 // null = the anime's general comments, a number = that episode's
  async list(animeId, offset, episode) {
    const url = `${Comments._base()}?select=id,user_id,username,name,body,parent_id,created_at&anime_id=eq.${Number(animeId)}&${Comments._ep(episode)}&parent_id=is.null&order=created_at.desc&limit=${Comments.PAGE}&offset=${offset}`;
    const r = await fetch(url, { headers: Comments._head({ Prefer: 'count=exact' }) });
    if (!r.ok) throw Object.assign(new Error('list failed'), { status: r.status });
    const rows = await r.json(), total = Number((r.headers.get('Content-Range') || '').split('/')[1]) || rows.length;
    let replies = [];
    if (rows.length) {
      const ids = rows.map(c => c.id).join(',');
      const rr = await fetch(`${Comments._base()}?select=id,user_id,username,name,body,parent_id,created_at&parent_id=in.(${ids})&order=created_at.asc&limit=500`, { headers: Comments._head() });
      if (rr.ok) replies = await rr.json();
    }
    return { rows, replies, total };
  },
  async count(animeId, episode) {                                              // Top-level plus replies, for the tab label
    const r = await fetch(`${Comments._base()}?select=id&anime_id=eq.${Number(animeId)}&${Comments._ep(episode)}&limit=1`, { headers: Comments._head({ Prefer: 'count=exact' }) });
    if (!r.ok) throw new Error('count failed');
    return Number((r.headers.get('Content-Range') || '').split('/')[1]) || 0;
  },
  async post(animeId, body, parentId, episode) {
    const sb = await Auth.client();
    const { data, error } = await sb.from('comments').insert({ anime_id: animeId, body, parent_id: parentId || null, episode: episode == null ? null : episode }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    const sb = await Auth.client();
    const { error } = await sb.from('comments').delete().eq('id', id);
    if (error) throw error;
  },

  _when(iso) {
    const s = Math.floor(Date.parse(iso) / 1000);
    return Date.now() / 1000 - s > 30 * 86400 ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : timeAgo(s);
  },
  _hue: s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; },
  _item(c, me, isReply) {
    const nm = c.name || c.username || '?', mine = me && me.username === c.username;
    return `<article class="cm-item${isReply ? ' reply' : ''}" data-id="${esc(c.id)}">
      <span class="cm-av" style="--h:${Comments._hue(c.username)}">${esc(nm.trim().charAt(0).toUpperCase())}</span>
      <div class="cm-main">
        <div class="cm-top"><b>${esc(nm)}</b><span class="cm-user">@${esc(c.username)}</span><time>${esc(Comments._when(c.created_at))}</time></div>
        <p class="cm-body">${esc(c.body).replace(/\n/g, '<br>')}</p>
        <div class="cm-acts">${isReply ? '' : '<button type="button" class="cm-link" data-act="reply">Reply</button>'}${mine ? '<button type="button" class="cm-link del" data-act="del">Delete</button>' : ''}</div>
        ${isReply ? '' : '<div class="cm-replybox"></div>'}
      </div></article>`;
  },
  _form(placeholder, cta) {
    return `<form class="cm-form" novalidate>
      <textarea maxlength="${Comments.MAX}" rows="2" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></textarea>
      <div class="cm-formbar"><span class="cm-count">0 / ${Comments.MAX}</span><span class="cm-err" role="alert"></span><button class="dp-btn primary sm" type="submit">${esc(cta)}</button></div>
    </form>`;
  },


  OK_KEY: 'as_cm_ok',
  _oks: () => { const l = jget('as_cm_ok', []); return Array.isArray(l) ? l : []; },
  allowed: id => !!Settings.get().showComments || Comments._oks().includes(Number(id)),
  allow(id) { const l = Comments._oks(); if (!l.includes(Number(id))) { l.push(Number(id)); jset('as_cm_ok', l.slice(-400)); } },
  unallow(id) { jset('as_cm_ok', Comments._oks().filter(x => x !== Number(id))); },
  /* Same as mount(), but behind the gate. onGate(true|false) tells the page whether the comments are hidden, so it can hide the count. */
  mountGated(root, animeId, onCount, episode = null, onGate) {
    const draw = () => {
      if (Comments.allowed(animeId)) {
        onGate && onGate(false);
        Comments.mount(root, animeId, onCount, episode);
        if (!Settings.get().showComments) {
          const b = document.createElement('div'); b.className = 'cm-regate';
          b.innerHTML = '<button type="button" class="cm-link">Hide comments for this anime</button>';
          b.firstChild.onclick = () => { Comments.unallow(animeId); draw(); };
          root.appendChild(b);
        }
        return;
      }
      root._tok = {};
      onGate && onGate(true);
      root.innerHTML = `<div class="cm-gate" role="group" aria-label="Spoiler alert">
        <span class="cm-gate-ic">${icon('eye', 22)}</span>
        <div class="cm-gate-txt"><strong>Spoiler alert</strong><p>Comments are hidden because they can spoil things you haven't watched yet.</p></div>
        <div class="cm-gate-act">
          <button type="button" class="dp-btn primary sm" data-gate="show">Show comments for this anime</button>
          <a class="dp-btn sm" href="settings.html?s=privacy">Turn on for every anime</a>
        </div></div>`;
      $('[data-gate="show"]', root).onclick = () => { Comments.allow(animeId); draw(); };
    };
    draw();
  },

  async mount(root, animeId, onCount, episode = null) {
    if (!Comments.ready()) { root.innerHTML = '<p class="empty">Comments need the login system. Add your Supabase URL and key in js/config.js.</p>'; return; }
    const st = { offset: 0, total: 0, replies: {} }, tok = root._tok = {};
    const me = () => Auth.current();

    root.innerHTML = `<div class="cm"><div class="cm-compose"></div><div class="cm-list"></div><div class="cm-more"></div></div>`;
    const compose = $('.cm-compose', root), listEl = $('.cm-list', root), moreEl = $('.cm-more', root);

    const bindForm = (form, parentId, done) => {
      const ta = $('textarea', form), cnt = $('.cm-count', form), err = $('.cm-err', form), btn = $('button[type=submit]', form);
      ta.addEventListener('input', () => { cnt.textContent = `${ta.value.length} / ${Comments.MAX}`; err.textContent = ''; ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const body = ta.value.trim();
        if (!body) { err.textContent = 'Write something first.'; return; }
        btn.disabled = true; err.textContent = '';
        try { const row = await Comments.post(animeId, body, parentId, episode); if (root._tok !== tok) return; ta.value = ''; done(row); }
        catch (x) { err.textContent = Comments._why(x); }
        btn.disabled = false;
      });
      return ta;
    };

    const paintCompose = () => {
      const u = me();
      if (!u) {
        compose.innerHTML = '<div class="cm-login"><span>Log in to join the conversation.</span><button type="button" class="dp-btn primary sm" id="cm-login">Log in</button></div>';
        $('#cm-login', compose).onclick = () => {
          openAuth('login');
          const t = setInterval(() => { if (!$('.auth-bg')) { clearInterval(t); if (me()) { paintCompose(); paintList(true); } } }, 500);
        };
        return;
      }
      compose.innerHTML = Comments._form(`Comment as ${u.name || u.username}...`, 'Post');
      bindForm($('form', compose), null, row => { st.total++; st.offset++; prepend(row); onCount && onCount(); });
    };

    const rowHTML = (c, replies) => Comments._item(c, me(), false) .replace('<div class="cm-replybox"></div>',
      `<div class="cm-replies">${(replies || []).map(r => Comments._item(r, me(), true)).join('')}</div><div class="cm-replybox"></div>`);

    let rows = [];
    const paintList = (reset) => {
      if (reset) { }
      listEl.innerHTML = rows.length ? rows.map(c => rowHTML(c, st.replies[c.id])).join('') : (episode == null ? '<p class="empty">No comments yet. Be the first.</p>' : '<p class="empty">No comments on this episode yet. Be the first.</p>');
      moreEl.innerHTML = rows.length < st.total ? '<button type="button" class="dp-btn sm" id="cm-more">Load more</button>' : '';
      const b = $('#cm-more', moreEl); if (b) b.onclick = () => load();
    };
    const prepend = row => { rows.unshift(row); st.replies[row.id] = []; paintList(); };

    const load = async () => {
      const b = $('#cm-more', moreEl); if (b) { b.disabled = true; b.textContent = 'Loading...'; }
      try {
        const { rows: got, replies, total } = await Comments.list(animeId, st.offset, episode);
        if (root._tok !== tok) return;
        st.total = total; st.offset += got.length;
        rows = rows.concat(got);
        replies.forEach(r => (st.replies[r.parent_id] = st.replies[r.parent_id] || []).push(r));
        paintList();
      } catch (e) {
        if (root._tok !== tok) return;
        listEl.innerHTML = e.status === 404
          ? '<p class="empty">Comments are not set up yet. Run <code>supabase/comments.sql</code> once in your Supabase SQL editor.</p>'
          : `<p class="empty">Could not load comments${e.status ? ' (error ' + e.status + ')' : ''}. <button type="button" class="dp-btn sm" id="cm-retry">Try again</button></p>`;
        const r = $('#cm-retry', listEl); if (r) r.onclick = () => { listEl.innerHTML = ''; load(); };
      }
    };

    root.onclick = async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const item = btn.closest('.cm-item'), id = item.dataset.id;
      if (btn.dataset.act === 'del') {
        if (!confirm('Delete this comment? This cannot be undone.')) return;
        try {
          await Comments.remove(id);
          const top = rows.findIndex(c => c.id === id);
          if (top > -1) { st.total--; st.offset--; rows.splice(top, 1); delete st.replies[id]; }
          else for (const k in st.replies) st.replies[k] = st.replies[k].filter(r => r.id !== id);
          paintList(); onCount && onCount();
        } catch (x) { toast(Comments._why(x)); }
      } else if (btn.dataset.act === 'reply') {
        if (!me()) { toast('Log in to reply.'); return; }
        const box = $('.cm-replybox', item);
        if (box.firstChild) { box.innerHTML = ''; return; }
        box.innerHTML = Comments._form('Write a reply...', 'Reply');
        const ta = bindForm($('form', box), id, row => { (st.replies[id] = st.replies[id] || []).push(row); paintList(); onCount && onCount(); });
        ta.focus();
      }
    };

    paintCompose();
    await load();
  },
  _why(x) {
    const m = String(x?.message || '');
    if (/too fast/i.test(m)) return 'You are commenting too fast. Wait a few seconds.';
    if (/profile/i.test(m)) return m;
    if (x?.code === '42P01' || x?.status === 404) return 'Comments are not set up yet (run supabase/comments.sql).';
    if (x?.code === '42501' || /row-level|permission/i.test(m)) return 'Log in again to comment.';
    if (x?.offline) return 'Could not reach the server.';
    return 'Could not post. Try again.';
  },
};
