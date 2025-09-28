const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=', 2);
    envVars[key.trim()] = value.trim();
  }
});

async function main() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE || envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔄 Adding task enhancement columns...');
  
  // First, create the exec_sql function
  console.log('📝 Creating exec_sql function...');
  const { error: createFuncError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS text AS $$
      BEGIN
        EXECUTE sql;
        RETURN 'OK';
      EXCEPTION WHEN OTHERS THEN
        RETURN SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });
  
  if (createFuncError && createFuncError.code !== 'PGRST202') {
    console.log('ℹ️  exec_sql function creation result:', createFuncError);
  }
  
  // Try direct SQL approach using the raw SQL query
  const migrations = [
    `DO $$ 
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='checklist_items' AND column_name='due_date') THEN
         ALTER TABLE checklist_items ADD COLUMN due_date timestamptz;
       END IF;
     END $$;`,
     
    `DO $$ 
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='checklist_items' AND column_name='assigned_to') THEN
         ALTER TABLE checklist_items ADD COLUMN assigned_to uuid;
       END IF;
     END $$;`,
     
    `DO $$ 
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='checklist_items' AND column_name='reminder_date') THEN
         ALTER TABLE checklist_items ADD COLUMN reminder_date timestamptz;
       END IF;
     END $$;`,
     
    `DO $$ 
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='checklist_items' AND column_name='reminder_interval') THEN
         ALTER TABLE checklist_items ADD COLUMN reminder_interval text;
       END IF;
     END $$;`,
     
    `DO $$ 
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='checklist_items' AND column_name='reminder_count') THEN
         ALTER TABLE checklist_items ADD COLUMN reminder_count integer DEFAULT 0;
       END IF;
     END $$;`
  ];
  
  // Try using the SQL Editor API endpoint
  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    console.log(`🔄 Running migration ${i + 1}/${migrations.length}...`);
    
    try {
      // Use the SQL editor endpoint directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql })
      });
      
      if (response.ok) {
        console.log(`✅ Migration ${i + 1} completed`);
      } else {
        const error = await response.text();
        console.log(`⚠️  Migration ${i + 1} response:`, error);
      }
    } catch (error) {
      console.error(`❌ Migration ${i + 1} error:`, error.message);
    }
  }
  
  console.log('🎉 All migrations attempted!');
  console.log('');
  console.log('📋 You may need to run these SQL commands manually in your Supabase SQL editor:');
  console.log('');
  migrations.forEach((sql, i) => {
    console.log(`-- Migration ${i + 1}:`);
    console.log(sql);
    console.log('');
  });
}

main().catch(console.error);