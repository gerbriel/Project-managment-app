/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const localEnv = path.join(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) dotenv.config({ path: localEnv });
else dotenv.config();

(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Migration aborted. Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE');
    process.exit(1);
  }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  const schemaPath = path.join(process.cwd(), 'schema', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  console.log('Applying schema.sql to Supabase…');
  // Supabase REST does not support arbitrary SQL; attempt best-effort via pg rpc
  // If you have direct SQL access, prefer running this file via psql.
  // Here, we split by semicolons and run executable statements we can map to tables via REST.
  // For simplicity in this demo, we warn and exit if direct SQL execution is not configured.
  console.log('Note: For full SQL execution (functions/triggers), run schema/schema.sql in the Supabase SQL editor.');
  console.log('Skipping programmatic execution to avoid partial application.');
})();
