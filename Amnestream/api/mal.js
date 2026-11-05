const PATHS = [/^\/v2\/users\/@me$/, /^\/v2\/anime\/\d{1,9}$/, /^\/v2\/anime\/\d{1,9}\/my_list_status$/];
const FORM_KEYS = ['status', 'score', 'num_watched_episodes', 'is_rewatching'];
const STATUSES = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'];
/* Vercel serverless function: forwards the few MyAnimeList API calls the site makes (read the profile, read/save/remove one anime's list entry).
   The browser sends the person's own access token in the X-MAL-Token header; nothing is stored here. Anything else is refused. */
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const origin = req.headers.origin;
  try { if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Wrong origin' }); } catch { return res.status(403).json({ error: 'Wrong origin' }); }
  const token = req.headers['x-mal-token'];
  if (!token || !/^[\w.-]{20,4096}$/.test(token)) return res.status(401).json({ error: 'Missing token' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const method = String(b.method || 'GET').toUpperCase(), path = String(b.path || '');
  if (!['GET', 'PATCH', 'DELETE'].includes(method) || !PATHS.some(r => r.test(path))) return res.status(400).json({ error: 'Not allowed' });
  const url = new URL('https://api.myanimelist.net' + path);
  if (b.query && typeof b.query.fields === 'string' && /^[a-z_,]{1,120}$/.test(b.query.fields)) url.searchParams.set('fields', b.query.fields);
  const init = { method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } };
  if (method === 'PATCH') {
    const f = new URLSearchParams();
    FORM_KEYS.forEach(k => { if (b.form && b.form[k] !== undefined && b.form[k] !== null) f.set(k, String(b.form[k])); });
    if (f.has('status') && !STATUSES.includes(f.get('status'))) return res.status(400).json({ error: 'Bad status' });
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded'; init.body = f;
  }
  try {
    const r = await fetch(url, init), text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text || '{}');
  } catch (e) { res.status(502).json({ error: 'Could not reach MyAnimeList' }); }
};
