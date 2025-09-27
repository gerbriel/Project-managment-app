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
    // Determine the current origin for GitHub Pages compatibility
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gerbriel.github.io';
    const isGitHubPages = currentOrigin.includes('github.io');
    
    console.log(`Initializing Supabase client for: ${currentOrigin}`);
    console.log(`Environment: ${import.meta.env.MODE}, GitHub Pages: ${isGitHubPages}`);
    
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
          // GitHub Pages specific headers
          ...(isGitHubPages ? {
            'Origin': currentOrigin,
            'Referer': currentOrigin + '/Project-managment-app/',
            'X-Forwarded-Host': 'gerbriel.github.io',
            'X-GitHub-Pages': 'true'
          } : {})
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
