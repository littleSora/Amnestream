/* Vercel serverless function: trades a MyAnimeList login code (or refresh token) for tokens.
   Browsers cannot call MAL's token endpoint directly (no CORS), so the site posts here and this forwards the request.
   Environment variables (Vercel > Project > Settings > Environment Variables):
     MAL_CLIENT_ID      your MAL API client ID (also served to the browser by api/config.js)
     MAL_CLIENT_SECRET  only if you registered the MAL app as type "web" (leave unset for type "other") */
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const origin = req.headers.origin;
  try { if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Wrong origin' }); } catch { return res.status(403).json({ error: 'Wrong origin' }); }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const clientId = process.env.MAL_CLIENT_ID || b.client_id;
  if (!clientId) return res.status(500).json({ error: 'MAL_CLIENT_ID is not set' });
  const form = new URLSearchParams({ client_id: clientId });
  if (process.env.MAL_CLIENT_SECRET) form.set('client_secret', process.env.MAL_CLIENT_SECRET);
  if (b.grant_type === 'authorization_code') {
    if (!b.code || !b.code_verifier || !b.redirect_uri) return res.status(400).json({ error: 'code, code_verifier and redirect_uri are required' });
    form.set('grant_type', 'authorization_code'); form.set('code', b.code); form.set('code_verifier', b.code_verifier); form.set('redirect_uri', b.redirect_uri);
  } else if (b.grant_type === 'refresh_token') {
    if (!b.refresh_token) return res.status(400).json({ error: 'refresh_token is required' });
    form.set('grant_type', 'refresh_token'); form.set('refresh_token', b.refresh_token);
  } else return res.status(400).json({ error: 'Unsupported grant_type' });
  try {
    const r = await fetch('https://myanimelist.net/v1/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text || '{}');
  } catch (e) { res.status(502).json({ error: 'Could not reach MyAnimeList' }); }
};
