import React from 'react';
import { getSupabase } from './supabaseClient';

type Props = { children: React.ReactNode };

export default function DevAuthGate({ children }: Props) {
  const [ready, setReady] = React.useState(false);
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  const isDevStatus = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev/status');

  if (isDevStatus) {
    return <>{children}</>;
  }

  if (!url || !anon) {
    return (
      <div className="min-h-screen bg-app text-app p-6">
        <h1 className="text-xl font-semibold mb-2">Supabase not configured</h1>
        <p className="text-muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the dev server.</p>
      </div>
    );
  }

  React.useEffect(() => {
    const run = async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb.auth.getSession();
        if (data.session) {
          setReady(true);
          return;
        }
        const email = (import.meta.env.VITE_DEMO_EMAIL as string) || '';
        const password = (import.meta.env.VITE_DEMO_PASSWORD as string) || '';
        if (!email || !password) {
          console.warn('No VITE_DEMO_EMAIL/PASSWORD set. You may see no data due to RLS.');
          setReady(true);
          return;
        }
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          console.error('Demo sign-in failed:', error.message);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    };
    void run();
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
