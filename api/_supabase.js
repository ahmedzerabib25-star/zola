// Shared helper for the /api/* read proxies. Anon key only — same key that's
// already public in script.js, safe to ship here too. RLS still applies.
const SUPABASE_URL = "https://caclaqpyfspkarpzfpxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2xhcXB5ZnNwa2FycHpmcHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODIzOTgsImV4cCI6MjEwMTg1ODM5OH0.Uyh-aUM0BWdaCOtoOmf0ofFJTG6399QhQh6S-C-Qcz4";

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${path} failed: ${res.status}`);
  return res.json();
}

module.exports = { sb };
