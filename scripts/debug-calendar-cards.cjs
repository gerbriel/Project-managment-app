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

async function debugCalendarCards() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE || envVars.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔍 Debugging Calendar Cards Loading Issues');
  console.log('==========================================');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test 1: Check cards table structure
  console.log('📋 Test 1: Checking cards table structure...');
  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .limit(1);
    
  if (cardsError) {
    console.log('❌ Error querying cards:', cardsError);
    return;
  }
  
  if (cardsData && cardsData[0]) {
    console.log('✅ Cards table columns:', Object.keys(cardsData[0]));
    console.log('📊 Sample card data:', cardsData[0]);
    
    const hasDateColumns = cardsData[0].hasOwnProperty('date_start') && cardsData[0].hasOwnProperty('date_end');
    console.log(`📅 Date columns exist: ${hasDateColumns ? '✅ YES' : '❌ NO'}`);
  }
  
  // Test 2: Check how many cards have dates
  console.log('\n📊 Test 2: Checking cards with dates...');
  const { data: datedCards, error: datedError } = await supabase
    .from('cards')
    .select('id, title, date_start, date_end')
    .not('date_start', 'is', null)
    .not('date_end', 'is', null);
    
  if (datedError) {
    console.log('❌ Error querying dated cards:', datedError);
    
    // Try without date filters if columns don't exist
    console.log('\n🔄 Trying basic cards query...');
    const { data: basicCards, error: basicError } = await supabase
      .from('cards')
      .select('id, title')
      .limit(5);
      
    if (basicError) {
      console.log('❌ Basic cards query failed:', basicError);
    } else {
      console.log('✅ Basic cards found:', basicCards?.length || 0);
      if (basicCards && basicCards.length > 0) {
        console.log('📝 Sample cards:', basicCards);
      }
    }
  } else {
    console.log(`✅ Cards with dates found: ${datedCards?.length || 0}`);
    if (datedCards && datedCards.length > 0) {
      console.log('📅 Sample dated cards:', datedCards.slice(0, 3));
    }
  }
  
  // Test 3: Check if cards table has the right schema
  console.log('\n🏗️ Test 3: Checking cards table schema...');
  try {
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'cards')
      .order('column_name');
      
    if (schema) {
      console.log('📋 Cards table schema:');
      schema.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else if (schemaError) {
      console.log('⚠️ Could not get schema:', schemaError.message);
    }
  } catch (error) {
    console.log('⚠️ Schema check failed:', error.message);
  }
  
  // Test 4: Check workspaces
  console.log('\n🏢 Test 4: Checking workspaces...');
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('id, name');
    
  if (workspacesError) {
    console.log('❌ Error querying workspaces:', workspacesError);
  } else {
    console.log(`✅ Workspaces found: ${workspaces?.length || 0}`);
    if (workspaces && workspaces.length > 0) {
      console.log('🏢 Available workspaces:', workspaces);
    }
  }
}

debugCalendarCards().catch(console.error);