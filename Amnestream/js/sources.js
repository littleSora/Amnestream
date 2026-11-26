/* Direct servers for the Amnestream player.

   An embedded server (the iframe ones in watch.js) plays inside somebody else's page, so subtitles, quality and speed are theirs to control.
   A direct server hands back the media itself, and js/vplayer.js plays it with its own controls, working subtitle switching, quality and speed.

   A direct server is { id, label, group, auto, usable(ctx), resolve(ctx) } where ctx = { anilistId, malId, episode, lang } and resolve() returns

     {
       sources:   [{ url, type?: 'hls' | 'file', label?: '1080p' }],                       // one or more renditions of the same episode
       subtitles: [{ url, label: 'English', lang: 'en', default?: true, format?: 'vtt' | 'srt' | 'ass' }],
       intro:     { start, end },                                                              // seconds, optional
       outro:     { start, end },                                                              // seconds, optional
       title?, poster?
     }

   To plug in your own backend, set  resolverUrl  in js/config.js (see README, "Direct player"). */
(function () {
  'use strict';

  const REG = [];
  const cfg = () => window.AS_CONFIG || {};

  function register(p) {
    if (!p || !p.id || typeof p.resolve !== 'function') throw new Error('AmneSources.register: need { id, resolve }');
    const i = REG.findIndex(x => x.id === p.id);
    const rec = { group: 'Amnestream player', auto: true, usable: () => true, ...p };
    if (i > -1) REG[i] = rec; else REG.push(rec);
    return rec;
  }

  const fail = (code, msg) => Object.assign(new Error(msg || code), { code });
  const typeOf = (url, hint) => hint === 'hls' || /\.m3u8(\?|#|$)/i.test(url) ? 'hls' : 'file';

  /* Accepts the usual spellings of the same thing so a backend does not have to match this file exactly */
  function normalise(raw) {
    const o = (raw && (raw.data || raw)) || {};
    if (o.noDub) throw fail('NO_DUB', 'No dub for this episode');
    let list = o.sources || o.streams || o.qualities || [];
    if (!Array.isArray(list)) list = [];
    list = list.map(s => typeof s === 'string' ? { url: s } : s).filter(s => s && (s.url || s.file || s.src));
    if (!list.length && (o.url || o.file)) list = [{ url: o.url || o.file }];
    const sources = list.map(s => {
      const url = s.url || s.file || s.src;
      return { url, type: typeOf(url, s.type), label: s.label || s.quality || '' };
    });
    if (!sources.length) throw fail('NO_SOURCE', 'The server returned no video');
    const subs = (o.subtitles || o.tracks || o.captions || []).map(t => {
      const url = t.url || t.file || t.src, lang = String(t.lang || t.srclang || t.language || '').toLowerCase();
      return url ? { url, label: t.label || t.name || t.language || t.lang || 'Subtitles', lang, default: !!(t.default || t.isDefault), format: t.format || '' } : null;
    }).filter(Boolean).filter(t => !/thumbnail/i.test(t.label));
    const range = r => r && isFinite(+r.start) && isFinite(+r.end) && +r.end > +r.start ? { start: +r.start, end: +r.end } : null;
    return { sources, subtitles: subs, intro: range(o.intro), outro: range(o.outro), title: o.title || '', poster: o.poster || '' };
  }

  /* ---- Your own resolver (set resolverUrl in js/config.js) ---- */
  function customProvider() {
    const url = String(cfg().resolverUrl || '').trim();
    if (!url) return null;
    return {
      id: 'direct',
      label: cfg().resolverLabel || 'Amnestream Player',
      usable: ctx => !(/\{mal\}/.test(url) && !ctx.malId) && !(/\{anilist\}/.test(url) && !ctx.anilistId),
      async resolve(ctx) {
        const u = url.replace(/\{anilist\}/g, ctx.anilistId || '').replace(/\{mal\}/g, ctx.malId || '')
          .replace(/\{ep\}/g, ctx.episode).replace(/\{lang\}/g, ctx.lang);
        const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 12000);
        let res;
        try { res = await fetch(u, { signal: ctrl.signal, headers: cfg().resolverHeaders || undefined }); }
        catch (e) { throw fail('NETWORK', e.name === 'AbortError' ? 'The server took too long to answer' : 'Could not reach the server'); }
        finally { clearTimeout(t); }
        if (res.status === 404) throw fail(ctx.lang === 'dub' ? 'NO_DUB' : 'NO_SOURCE', 'Not found');
        if (!res.ok) throw fail('HTTP_' + res.status, 'Server answered ' + res.status);
        let j; try { j = await res.json(); } catch { throw fail('BAD_JSON', 'The server did not return JSON'); }
        return normalise(j);
      },
    };
  }

  /* ---- Intro / outro times (metadata only, from the community AniSkip database; silent when unavailable) ---- */
  const skipCache = new Map();
  async function skipTimes(malId, episode, lengthSec) {
    if (!malId) return null;
    const key = malId + ':' + episode;
    if (skipCache.has(key)) return skipCache.get(key);
    const job = (async () => {
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(`https://api.aniskip.com/v2/skip-times/${malId}/${episode}?types=op&types=ed&episodeLength=${Math.round(lengthSec || 0)}`, { signal: ctrl.signal });
        if (!res.ok) return null;
        const j = await res.json(), out = { intro: null, outro: null };
        (j.results || []).forEach(r => {
          const iv = r.interval || {}, range = isFinite(iv.startTime) && isFinite(iv.endTime) ? { start: iv.startTime, end: iv.endTime } : null;
          if (r.skipType === 'op' && range) out.intro = range;
          if (r.skipType === 'ed' && range) out.outro = range;
        });
        return out.intro || out.outro ? out : null;
      } catch { return null; } finally { clearTimeout(t); }
    })();
    skipCache.set(key, job);
    return job;
  }

  window.AmneSources = {
    register,
    list: () => REG.map(p => ({ id: p.id, label: p.label, group: p.group, auto: p.auto })),
    get: id => REG.find(p => p.id === id) || null,
    usable: (id, ctx) => { const p = REG.find(x => x.id === id); return !!p && p.usable(ctx); },
    async resolve(id, ctx) {
      const p = REG.find(x => x.id === id);
      if (!p) throw fail('NO_SERVER', 'Unknown server');
      return p.resolve(ctx);
    },
    skipTimes,
    normalise,
  };
})();
