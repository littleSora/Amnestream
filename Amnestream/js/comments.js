const Comments = {
  PAGE: 15, MAX: 1000,
  /* A spoiler comment is saved with this tag in front of its text (no database change needed); readers see it hidden behind an eye button */
  SPOILER: '[spoiler] ',
  _split: body => { body = String(body || ''); return body.startsWith(Comments.SPOILER) ? { spoiler: true, text: body.slice(Comments.SPOILER.length) } : { spoiler: false, text: body }; },
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
    await Comments.loadAvatars(rows.concat(replies).map(c => c.user_id));
    return { rows, replies, total };
  },
  async count(animeId, episode) {                                              // Top-level plus replies, for the tab label
    const r = await fetch(`${Comments._base()}?select=id&anime_id=eq.${Number(animeId)}&${Comments._ep(episode)}&limit=1`, { headers: Comments._head({ Prefer: 'count=exact' }) });
    if (!r.ok) throw new Error('count failed');
    return Number((r.headers.get('Content-Range') || '').split('/')[1]) || 0;
  },
  async post(animeId, body, parentId, episode, spoiler) {
    if (spoiler) body = Comments.SPOILER + body;
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
  /* Profile pictures: comments only store who wrote them, so the pictures are looked up by user id (one request per page, remembered afterwards).
     Needs the comment-avatars view in Supabase; until then (or if a lookup fails) everyone without a known picture keeps the coloured letter. */
  _av: {},
  _okSrc: v => typeof v === 'string' && /^(https?:\/\/|data:image\/)/i.test(v),
  async loadAvatars(ids) {
    ids = [...new Set(ids.filter(Boolean))].filter(id => !(id in Comments._av));
    if (!ids.length) return;
    ids.forEach(id => { Comments._av[id] = ''; });                            // Mark as asked, so a failure is not retried on every redraw
    for (const src of ['profile_avatars', 'profiles']) {
      try {
        const r = await fetch(`${window.AS_CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${src}?select=id,avatar&id=in.(${ids.join(',')})`, { headers: Comments._head() });
        if (!r.ok) continue;
        (await r.json()).forEach(p => { if (Comments._okSrc(p.avatar)) Comments._av[p.id] = p.avatar; });
        return;
      } catch { }
    }
  },
  _avatar(c, me, nm) {
    const mine = me && me.username === c.username;
    const src = mine ? me.avatar : Comments._av[c.user_id];
    const letter = esc(nm.trim().charAt(0).toUpperCase());
    return `<span class="cm-av${Comments._okSrc(src) ? ' has-img' : ''}" style="--h:${Comments._hue(c.username)}">${letter}${Comments._okSrc(src) ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>`;
  },
  _hue: s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; },
  _item(c, me, isReply) {
    const nm = c.name || c.username || '?', mine = me && me.username === c.username, sp = Comments._split(c.body);
    return `<article class="cm-item${isReply ? ' reply' : ''}" data-id="${esc(c.id)}">
      ${Comments._avatar(c, me, nm)}
      <div class="cm-main">
        <div class="cm-top"><b>${esc(nm)}</b><span class="cm-user">@${esc(c.username)}</span><time>${esc(Comments._when(c.created_at))}</time></div>
        ${sp.spoiler
          ? `<div class="cm-spoil"><button type="button" class="cm-eye" data-act="spoil" aria-pressed="false" aria-label="Show spoiler comment">${icon('eye', 16)}</button><span class="cm-spoil-l">Spoiler comment</span><p class="cm-body" hidden>${esc(sp.text).replace(/\n/g, '<br>')}</p></div>`
          : `<p class="cm-body">${esc(sp.text).replace(/\n/g, '<br>')}</p>`}
        <div class="cm-acts">${isReply ? '' : '<button type="button" class="cm-link" data-act="reply">Reply</button>'}${mine ? '<button type="button" class="cm-link del" data-act="del">Delete</button>' : ''}</div>
        ${isReply ? '' : '<div class="cm-replybox"></div>'}
      </div></article>`;
  },
  _form(placeholder, cta) {
    return `<form class="cm-form" novalidate>
      <textarea maxlength="${Comments.MAX}" rows="2" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></textarea>
      <div class="cm-formbar"><span class="cm-count">0 / ${Comments.MAX}</span><span class="cm-err" role="alert"></span>
        <label class="cm-sw" title="Hide this comment behind an eye button"><input type="checkbox" role="switch" aria-label="Spoiler"><span class="cm-sw-t" aria-hidden="true"></span><em>Spoiler</em></label>
        <button class="dp-btn primary sm" type="submit">${esc(cta)}</button></div>
    </form>`;
  },


  OK_KEY: 'as_cm_ok',
  _oks: () => { const l = jget('as_cm_ok', []); return Array.isArray(l) ? l : []; },
  allowed: id => !!Settings.get().showComments || Comments._oks().includes(Number(id)),
  allow(id) {                                            // Remembered for this anime (and on your other devices when signed in)
    const l = Comments._oks();
    if (!l.includes(Number(id))) { l.push(Number(id)); try { jset('as_cm_ok', l.slice(-400)); } catch { } Sync.touch('cm'); }
  },
  unallow(id) { try { jset('as_cm_ok', Comments._oks().filter(x => x !== Number(id))); } catch { } Sync.touch('cm'); },
  /* Same as mount(), but behind the gate. onGate(true|false) tells the page whether the comments are hidden, so it can hide the count. */
  mountGated(root, animeId, onCount, episode = null, onGate) {
    const draw = () => {
      if (Comments.allowed(animeId)) {
        onGate && onGate(false);
        Comments.mount(root, animeId, onCount, episode);
        const b = document.createElement('div'); b.className = 'cm-regate';
        if (!Settings.get().showComments) {
          b.innerHTML = '<button type="button" class="cm-link">Hide comments for this anime</button>';
          b.firstChild.onclick = () => { Comments.unallow(animeId); draw(); };
        } else {
          b.innerHTML = '<button type="button" class="cm-link">Hide comments on every anime</button>';
          b.firstChild.onclick = () => { Settings.set('showComments', false); Comments.unallow(animeId); toast('Comments are hidden again'); draw(); };
        }
        root.appendChild(b);
        return;
      }
      root._tok = {};
      onGate && onGate(true);
      root.innerHTML = `<div class="cm-gate" role="group" aria-label="Spoiler alert">
        <span class="cm-gate-ic">${icon('eye', 22)}</span>
        <strong>Spoiler alert</strong>
        <button type="button" class="dp-btn primary sm" data-gate="show">Show comments for this anime</button>
      </div>`;
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
      const ta = $('textarea', form), cnt = $('.cm-count', form), err = $('.cm-err', form), btn = $('button[type=submit]', form), sw = $('.cm-sw input', form);
      const cap = () => Comments.MAX;       // The limit is 1000 characters of text, with or without the spoiler switch (the hidden tag is not counted)
      sw.addEventListener('change', () => { ta.maxLength = cap(); if (ta.value.length > cap()) ta.value = ta.value.slice(0, cap()); cnt.textContent = `${ta.value.length} / ${cap()}`; });
      ta.addEventListener('input', () => { cnt.textContent = `${ta.value.length} / ${cap()}`; err.textContent = ''; ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const body = ta.value.trim();
        if (!body) { err.textContent = 'Write something first.'; return; }
        btn.disabled = true; err.textContent = '';
        try { const row = await Comments.post(animeId, body, parentId, episode, sw.checked); if (root._tok !== tok) return; ta.value = ''; sw.checked = false; ta.maxLength = Comments.MAX; cnt.textContent = `0 / ${Comments.MAX}`; done(row); }
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
      if (btn.dataset.act === 'spoil') {                                    // The eye: show or hide this one spoiler comment
        const box = btn.closest('.cm-spoil'), open = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(open));
        btn.setAttribute('aria-label', open ? 'Hide spoiler comment' : 'Show spoiler comment');
        btn.innerHTML = icon(open ? 'eyeoff' : 'eye', 16);
        box.classList.toggle('open', open);
        $('.cm-body', box).hidden = !open;
        $('.cm-spoil-l', box).textContent = open ? 'Spoiler' : 'Spoiler comment';
      } else if (btn.dataset.act === 'del') {
        const sure = await UiModal.confirm({ icon: 'trash', danger: true, title: 'Delete this comment?', text: 'This cannot be undone.', ok: 'Delete', cancel: 'Keep it' });
        if (!sure) return;
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
    if (x?.code === '23514' || /check constraint|too long/i.test(m)) return 'Too long for the database. Run supabase/comments-limit.sql once.';
    if (x?.code === '42501' || /row-level|permission/i.test(m)) return 'Log in again to comment.';
    if (x?.offline) return 'Could not reach the server.';
    return 'Could not post. Try again.';
  },
};
