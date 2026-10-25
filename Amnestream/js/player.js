/* Player core: multi-provider registry with health tracking and auto-failover; needs only an AniList id and a MAL id (providers missing an id are skipped). Usage: Player.mount(el, { anilistId, malId, episode, lang, onEpisodeEnd, onProviderChange }) returns a handle with setEpisode(n) and destroy() */
(function () {
  'use strict';

  const READY_TIMEOUT = 9000;       // No ready signal in 9s: assume dead
  const DEAD_TTL      = 30 * 60e3;  // Benched providers stay benched for 30 min
  const LAST_KEY      = 'amnestream.player.provider';
  const HEALTH_KEY    = 'amnestream.player.health';

  /* Providers: url(anilistId, malId, episode, lang) returns an embed URL; key says which id it needs; order sets priority; failing providers are auto-benched */
  const PROVIDERS = [
    /* AniList-keyed providers */
    {
      id: 'anixo', label: 'Anixo', key: 'anilist',
      url: (a, m, ep, lang) => `https://anixo.buzz/embed/ani/${a}/${ep}?track=${lang}`,
    },
    {
      id: 'megavid', label: 'MegaVid', key: 'anilist',
      url: (a, m, ep, lang) => `https://megavid.buzz/stream/ani/${a}/${ep}/${lang}`,
    },
    {
      id: 'megavid-mirror', label: 'MegaVid Mirror', key: 'anilist',
      url: (a, m, ep, lang) => `https://ani.megaplay.su/stream/ani/${a}/${ep}/${lang}`,
    },
    {
      id: 'megaplay', label: 'MegaPlay', key: 'anilist',
      url: (a, m, ep, lang) => `https://megaplay.buzz/stream/ani/${a}/${ep}/${lang}`,
    },
    {
      id: 'vidnest', label: 'VidNest', key: 'anilist',
      url: (a, m, ep, lang) => `https://vidnest.fun/animepahe/${a}/${ep}/${lang}`,
    },

    /* MAL-keyed providers (work without AniList) */
    {
      id: 'anixo-mal', label: 'Anixo (MAL)', key: 'mal',
      url: (a, m, ep, lang) => `https://anixo.buzz/embed/mal/${m}/${ep}?track=${lang}`,
    },
    {
      id: 'megavid-mal', label: 'MegaVid (MAL)', key: 'mal',
      url: (a, m, ep, lang) => `https://megavid.buzz/stream/mal/${m}/${ep}/${lang}`,
    },
    {
      id: 'megaplay-mal', label: 'MegaPlay (MAL)', key: 'mal',
      url: (a, m, ep, lang) => `https://megaplay.buzz/stream/mal/${m}/${ep}/${lang}`,
    },
  ];

  /* Health */
  function readHealth() {
    try { return JSON.parse(localStorage.getItem(HEALTH_KEY)) || {}; } catch { return {}; }
  }
  function writeHealth(h) {
    try { localStorage.setItem(HEALTH_KEY, JSON.stringify(h)); } catch { /* ignore */ }
  }
  function isDead(id) {
    const e = readHealth()[id];
    return !!e && e.until > Date.now();
  }
  function markDead(id, why) {
    const h = readHealth();
    h[id] = { until: Date.now() + DEAD_TTL, why: why || 'no signal' };
    writeHealth(h);
  }
  function markAlive(id) {
    const h = readHealth();
    if (h[id]) { delete h[id]; writeHealth(h); }
  }

  function usable(p, ctx) {
    return p.key === 'mal' ? !!ctx.malId : !!ctx.anilistId;
  }
  function pool(ctx) {
    const all = PROVIDERS.filter(p => usable(p, ctx));
    const live = all.filter(p => !isDead(p.id));
    return live.length ? live : all;
  }
  function chooseProvider(ctx, preferId) {
    const list = pool(ctx);
    if (!list.length) return null;
    if (preferId) {
      const hit = list.find(p => p.id === preferId);
      if (hit) return hit;
    }
    const last = localStorage.getItem(LAST_KEY);
    return (last && list.find(p => p.id === last)) || list[0];
  }
  function nextAfter(currentId, ctx) {
    const list = pool(ctx);
    if (!list.length) return null;
    const i = list.findIndex(p => p.id === currentId);
    return list[(i + 1) % list.length];
  }

  /* Event parsing (providers differ in payload shape, so stay tolerant) */
  function readEvent(data) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return { kind: '' }; }
    }
    if (!data || typeof data !== 'object') return { kind: '' };
    const bag = [data.type, data.event, data.name, data.action,
                 data.status, data.playerEvent, data.msg]
      .filter(Boolean).join(' ').toLowerCase();
    if (/error|fail|unavailable|not ?found|410/.test(bag)) return { kind: 'error' };
    if (/complete|ended|finish/.test(bag)) return { kind: 'complete' };
    if (/ready|playing|play|loaded|canplay/.test(bag)) return { kind: 'ready' };
    return { kind: '' };
  }

  /* Styles (injected once) */
  function injectStyles() {
    if (document.getElementById('am-player-css')) return;
    const s = document.createElement('style');
    s.id = 'am-player-css';
    s.textContent = `
      .am-player{display:flex;flex-direction:column;gap:10px}
      .am-player-stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;
        border-radius:12px;overflow:hidden}
      .am-player-frame{position:absolute;inset:0;width:100%;height:100%;border:0}
      .am-player-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px}
      .am-player-bar select{background:#18181b;color:#e4e4e7;border:1px solid #2e2e33;
        border-radius:8px;padding:6px 8px;font:inherit}
      .am-player-bar button{background:#18181b;color:#e4e4e7;border:1px solid #2e2e33;
        border-radius:8px;padding:6px 10px;font:inherit;cursor:pointer}
      .am-player-bar button:hover{border-color:#52525b}
      .am-player-lang{display:inline-flex;gap:4px}
      .am-player-lang button[aria-pressed="true"]{background:#e4e4e7;color:#09090b;border-color:#e4e4e7}
      .am-player-status{color:#a1a1aa;font-size:12px}
      .am-player-field{display:inline-flex;align-items:center;gap:6px;color:#a1a1aa}
    `;
    document.head.appendChild(s);
  }

  /* Mount */
  function mount(root, opts) {
    if (!root) throw new Error('Player.mount: missing root element');
    opts = opts || {};
    injectStyles();

    const ctx = {
      anilistId: opts.anilistId || null,
      malId: opts.malId || null,
      episode: opts.episode || 1,
      lang: opts.lang === 'dub' ? 'dub' : 'sub',
    };

    let current = chooseProvider(ctx, opts.provider);
    let destroyed = false;
    let signalled = false;
    let watchdog = 0;
    let autoChain = 0;

    if (!current) throw new Error('Player.mount: no usable provider for this title');

    root.classList.add('am-player');
    root.innerHTML =
      '<div class="am-player-stage">' +
        '<iframe class="am-player-frame" allowfullscreen ' +
          'allow="autoplay; fullscreen; picture-in-picture; encrypted-media" ' +
          'referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      '</div>' +
      '<div class="am-player-bar">' +
        '<label class="am-player-field"><span>Server</span>' +
          '<select class="am-player-server"></select></label>' +
        '<div class="am-player-lang" role="group" aria-label="Audio">' +
          '<button type="button" data-lang="sub">SUB</button>' +
          '<button type="button" data-lang="dub">DUB</button>' +
        '</div>' +
        '<button type="button" class="am-player-reload">Reload</button>' +
        '<button type="button" class="am-player-next">Next server</button>' +
        '<span class="am-player-status" aria-live="polite"></span>' +
      '</div>';

    const frame = root.querySelector('.am-player-frame');
    const serverSel = root.querySelector('.am-player-server');
    const statusEl = root.querySelector('.am-player-status');

    function setStatus(t) { statusEl.textContent = t || ''; }

    function refreshServerList() {
      serverSel.innerHTML = '';
      PROVIDERS.forEach(p => {
        if (!usable(p, ctx)) return;
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = isDead(p.id) ? p.label + ' (failed)' : p.label;
        serverSel.appendChild(o);
      });
      if (current) serverSel.value = current.id;
    }

    function updateLangButtons() {
      root.querySelectorAll('[data-lang]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.lang === ctx.lang));
      });
    }

    function load(provider, reason) {
      if (destroyed || !provider) return;
      current = provider;
      signalled = false;
      clearTimeout(watchdog);

      frame.src = provider.url(ctx.anilistId, ctx.malId, ctx.episode, ctx.lang);
      try { localStorage.setItem(LAST_KEY, provider.id); } catch { /* ignore */ }
      refreshServerList();
      setStatus(reason || '');
      if (opts.onProviderChange) opts.onProviderChange(provider);

      watchdog = setTimeout(() => {
        if (signalled || destroyed) return;
        markDead(provider.id, 'no ready signal');
        refreshServerList();
        if (autoChain < PROVIDERS.length) {
          autoChain++;
          const nxt = nextAfter(provider.id, ctx);
          if (nxt && nxt.id !== provider.id) {
            load(nxt, provider.label + ' never started - switched');
            return;
          }
        }
        setStatus('No server responded - pick one manually');
      }, READY_TIMEOUT);
    }

    function onMessage(e) {
      if (destroyed) return;
      if (e.source && e.source !== frame.contentWindow) return;
      const { kind } = readEvent(e.data);

      if (kind === 'error') {
        markDead(current.id, 'player error');
        refreshServerList();
        const nxt = nextAfter(current.id, ctx);
        if (nxt && nxt.id !== current.id) {
          load(nxt, current.label + ' errored - switched');
        } else {
          setStatus('All servers failing - try Reload');
        }
      } else if (kind === 'ready') {
        signalled = true;
        clearTimeout(watchdog);
        autoChain = 0;
        markAlive(current.id);
        setStatus('');
      } else if (kind === 'complete') {
        if (opts.onEpisodeEnd) opts.onEpisodeEnd();
      }
    }

    window.addEventListener('message', onMessage);

    serverSel.addEventListener('change', () => {
      autoChain = 0;
      const p = PROVIDERS.find(x => x.id === serverSel.value);
      if (p) load(p, '');
    });
    root.querySelector('.am-player-reload').addEventListener('click', () => {
      autoChain = 0;
      load(current, '');
    });
    root.querySelector('.am-player-next').addEventListener('click', () => {
      autoChain = 0;
      const nxt = nextAfter(current.id, ctx);
      if (nxt) load(nxt, '');
    });
    root.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        ctx.lang = btn.dataset.lang;
        updateLangButtons();
        load(current, '');
      });
    });

    refreshServerList();
    updateLangButtons();
    load(current, '');

    return {
      get provider() { return current && current.id; },
      get episode() { return ctx.episode; },
      setEpisode(ep) { ctx.episode = ep; autoChain = 0; load(current, ''); },
      setLang(l) { ctx.lang = l === 'dub' ? 'dub' : 'sub'; updateLangButtons(); load(current, ''); },
      nextServer() { autoChain = 0; const n = nextAfter(current.id, ctx); if (n) load(n, ''); },
      reload() { autoChain = 0; load(current, ''); },
      destroy() {
        destroyed = true;
        clearTimeout(watchdog);
        window.removeEventListener('message', onMessage);
        frame.src = 'about:blank';
        root.innerHTML = '';
      },
    };
  }

  /* Compatibility shim for old call sites */
  function embedURL(providerId, anilistId, malId, episode, lang) {
    const p = PROVIDERS.find(x => x.id === providerId) || PROVIDERS[0];
    const id = p.key === 'mal' ? malId : anilistId;
    if (!id) return null;
    return p.url(anilistId, malId, episode, lang || 'sub');
  }

  window.Player = {
    mount, embedURL,
    providers: () => PROVIDERS.map(p => ({ ...p })),
    health: () => readHealth(),
    resetHealth() { writeHealth({}); },
    deadProviders: () => PROVIDERS.filter(p => isDead(p.id)).map(p => p.id),
  };
})();