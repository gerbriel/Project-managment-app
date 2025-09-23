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
  if (!url || !anon) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Sign-in failed:', error.message);
    process.exit(2);
  } else {
    console.log('Sign-in OK. User:', data.user?.email, 'Access token len:', data.session?.access_token?.length);
  }
})();
