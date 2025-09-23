/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const localEnv = path.join(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
else dotenv.config();

(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.VITE_DEMO_EMAIL;
  const password = process.env.VITE_DEMO_PASSWORD;
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signErr } = await sb.auth.signInWithPassword({ email, password });
  if (signErr) {
    console.error('Sign-in failed:', signErr);
    process.exit(2);
  }
  const { data, error } = await sb.from('boards').select('id, workspace_id, name').order('name', { ascending: true });
  if (error) {
    console.error('Boards fetch error:', error);
  } else {
    console.log('Boards:', data);
  }
})();
