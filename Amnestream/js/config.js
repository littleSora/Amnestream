window.AS_CONFIG = {
  malClientId: '',
  malApi: '/api',
  /* Direct player (optional). Point this at your OWN backend that returns a media link for an episode and the built-in player will use it.
     Placeholders: {anilist} {mal} {ep} {lang}. Expected JSON is described in js/sources.js and the README. Leave empty to use only the embedded servers.
     resolverUrl: 'https://your-host.example/resolve?anilist={anilist}&ep={ep}&lang={lang}',
     resolverLabel: 'Amnestream Player', */
  resolverUrl: '',
  supabaseUrl: 'https://ubvkepjbnxpnqbbsmczj.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidmtlcGpibnhwbnFiYnNtY3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzk0NjMsImV4cCI6MjEwODY1NTQ2M30.IMLC1HV22ps1cwFwa7G1HZGM_tedge85sGRpTsO6q8k',
};
