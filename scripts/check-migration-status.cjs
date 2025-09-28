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
  
  console.log('🔄 Testing database access...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test basic connection
  const { data: testData, error: testError } = await supabase
    .from('checklist_items')
    .select('id')
    .limit(1);
    
  if (testError) {
    console.error('❌ Database connection failed:', testError);
    return;
  }
  
  console.log('✅ Database connected successfully');
  
  // Check current table structure
  console.log('🔍 Checking current table structure...');
  
  const { data: existingData, error: existingError } = await supabase
    .from('checklist_items')
    .select('*')
    .limit(1);
    
  if (existingData && existingData[0]) {
    console.log('📋 Current columns:', Object.keys(existingData[0]));
    
    const hasEnhancedColumns = existingData[0].hasOwnProperty('due_date') || 
                               existingData[0].hasOwnProperty('assigned_to');
    
    if (hasEnhancedColumns) {
      console.log('✅ Enhanced columns already exist!');
      console.log('🎉 Your database is ready for task management features!');
      return;
    }
  }
  
  console.log('⚠️  Enhanced columns missing - manual migration required');
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('1. Open your Supabase dashboard: https://supabase.com/dashboard');
  console.log(`2. Go to your project: ${supabaseUrl}`);
  console.log('3. Click "SQL Editor" in the left sidebar');
  console.log('4. Copy and paste the SQL from MIGRATION.sql file');
  console.log('5. Click "Run" to execute the migration');
  console.log('');
  console.log('📄 The MIGRATION.sql file contains all necessary SQL commands');
  console.log('');
  
  // Also create a simplified test
  console.log('🔧 Testing if we can create a simple function...');
  try {
    const testSql = `
      CREATE OR REPLACE FUNCTION test_connection()
      RETURNS text AS $$
      BEGIN
        RETURN 'Connection OK';
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/test_connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    });
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Function test:', result);
    } else {
      console.log('⚠️  Cannot execute SQL via API - manual migration required');
    }
    
  } catch (error) {
    console.log('⚠️  API execution not available - use Supabase dashboard instead');
  }
}

main().catch(console.error);