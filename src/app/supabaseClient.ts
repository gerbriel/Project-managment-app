import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  if (!url || !anon) {
    // Actionable guidance without crashing the whole app at import-time
    console.error(
      'Supabase env missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local at project root and restart the dev server.'
    );
    throw new Error(
      'Supabase env missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
    );
  }
  if (!client) {
    client = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

export default getSupabase;
