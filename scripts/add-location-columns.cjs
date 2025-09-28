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
  
  console.log('Connecting to Supabase to add location columns...');
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { 
    auth: { persistSession: false, autoRefreshToken: false } 
  });

  try {
    // Add location columns
    console.log('Adding location_lat column...');
    await sb.rpc('sql', { 
      query: 'ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lat double precision;' 
    }).throwOnError();

    console.log('Adding location_lng column...');
    await sb.rpc('sql', { 
      query: 'ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lng double precision;' 
    }).throwOnError();

    console.log('Adding location_address column...');
    await sb.rpc('sql', { 
      query: 'ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_address text;' 
    }).throwOnError();

    console.log('Creating location index...');
    await sb.rpc('sql', { 
      query: 'CREATE INDEX IF NOT EXISTS cards_board_loc_idx ON public.cards(board_id, location_lat, location_lng);' 
    }).throwOnError();

    console.log('✅ Location columns added successfully!');
    
    // Verify columns exist
    const { data, error } = await sb
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'cards')
      .in('column_name', ['location_lat', 'location_lng', 'location_address']);
    
    if (error) {
      console.warn('Could not verify columns:', error.message);
    } else {
      console.log('Verified columns:', data);
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    
    // Fallback: Try simple approach
    console.log('\nTrying alternative approach...');
    try {
      const { error: altError } = await sb.from('cards').select('location_lat, location_lng, location_address').limit(1);
      if (altError && altError.message.includes('column') && altError.message.includes('does not exist')) {
        console.error('❌ Location columns still missing. Please run scripts/add-location-columns.sql manually in Supabase SQL editor.');
        console.log('\nInstructions:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the contents of scripts/add-location-columns.sql');
        process.exit(1);
      } else {
        console.log('✅ Columns appear to exist now!');
      }
    } catch (testError) {
      console.error('❌ Could not verify columns. Manual intervention required.');
      console.log('\nPlease run scripts/add-location-columns.sql in Supabase SQL editor.');
      process.exit(1);
    }
  }
})();