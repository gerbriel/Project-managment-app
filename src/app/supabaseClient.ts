import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  
  if (!url || !anon) {
    // Better error message for production
    const isProduction = import.meta.env.PROD;
    const envMessage = isProduction 
      ? 'Supabase configuration missing. Please check GitHub repository secrets or environment variables.'
      : 'Supabase env missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local at project root and restart the dev server.';
    
    console.error(envMessage);
    throw new Error(envMessage);
  }
  
  if (!client) {
    client = createClient(url, anon, { 
      auth: { 
        persistSession: true, 
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'tryed-web-app',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'tryed/1.0',
          // Add GitHub Pages specific headers
          'Origin': typeof window !== 'undefined' ? window.location.origin : 'https://gerbriel.github.io'
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return client;
}

export default getSupabase;
