/* Vercel serverless function: hands the browser the MyAnimeList client ID from the MAL_CLIENT_ID environment variable
   (Vercel > Project > Settings > Environment Variables), so the ID does not have to be committed to the repo.
   The client ID is not a secret (it is visible in MAL's login URL), and this never returns the client secret. */
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  res.status(200).json({ malClientId: String(process.env.MAL_CLIENT_ID || '').trim() });
};
