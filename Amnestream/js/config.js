/* Supabase project settings. Both values are PUBLIC by design (they ship to every browser); data is protected by the row-level security rules in supabase/schema.sql.
   Find them in Supabase: Project Settings > API > Project URL and "anon" / publishable key. */
window.AS_CONFIG = {
  /* MyAnimeList: leave this empty. The MAL client ID is read from the MAL_CLIENT_ID environment variable on Vercel (api/config.js), so it is not stored in the repo.
     Only fill it in if you host without Vercel. See README > MyAnimeList. */
  malClientId: '',
  malApi: '/api',                       // Where api/mal.js and api/mal-token.js are served (same site on Vercel)
  supabaseUrl: 'https://ubvkepjbnxpnqbbsmczj.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidmtlcGpibnhwbnFiYnNtY3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzk0NjMsImV4cCI6MjEwODY1NTQ2M30.IMLC1HV22ps1cwFwa7G1HZGM_tedge85sGRpTsO6q8k',
};
