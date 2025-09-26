import React from 'react';
import { getSupabase } from '@app/supabaseClient';
import { getBoards } from '@api/boards';

export default function DevStatus() {
  const [envOk, setEnvOk] = React.useState(false);
  const [session, setSession] = React.useState<any>(null);
  const [boardsCount, setBoardsCount] = React.useState<number | null>(null);
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  React.useEffect(() => {
    setEnvOk(Boolean(url && anon));
    if (!url || !anon) return;
    (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb.auth.getSession();
        setSession(data.session ?? null);
        const boards = await getBoards('2a8f10d6-4368-43db-ab1d-ab783ec6e935');
        setBoardsCount(boards.length);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [url, anon]);

  return (
    <div className="min-h-screen bg-app text-app p-6">
      <h1 className="text-2xl font-semibold mb-4">Dev Status</h1>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Env present:</span>{' '}
          {envOk ? 'Yes' : 'No (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)'}
        </div>
        <div>
          <span className="font-medium">Session:</span>{' '}
          {session ? 'Signed in' : 'No session'}
        </div>
        <div>
          <span className="font-medium">Boards readable:</span>{' '}
          {boardsCount === null ? '—' : boardsCount}
        </div>
      </div>
    </div>
  );
}
