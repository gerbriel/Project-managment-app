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

async function testCalendarQuery() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE || envVars.VITE_SUPABASE_ANON_KEY;
  
  console.log('🧪 Testing Exact Calendar Query');
  console.log('==============================');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const workspaceId = '2a8f10d6-4368-43db-ab1d-ab783ec6e935';
  
  // Test exact query from getCardsWithDates
  const baseSelect = `
    id, workspace_id, board_id, list_id, title, description, date_start, date_end, position, created_by, created_at, updated_at,
    card_field_values:card_field_values(field_id, value, custom_field_defs:custom_field_defs(name)),
    card_labels:card_labels(label_id, labels:labels(id, name, color)),
    attachments:attachments(id, mime, url, created_at),
    comments:comments(id, author_id, created_at),
    checklists:checklists(id, checklist_items:checklist_items(id, done)),
    boards:boards(name)
  `;
  
  console.log('📋 Running full query with all relations...');
  const { data, error } = await supabase
    .from('cards')
    .select(baseSelect)
    .eq('workspace_id', workspaceId)
    .not('date_start', 'is', null)
    .not('date_end', 'is', null)
    .order('date_start', { ascending: true });
    
  if (error) {
    console.log('❌ Full query error:', error);
    
    // Try simplified query
    console.log('\n🔄 Trying simplified query...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('cards')
      .select('id, title, date_start, date_end, board_id, boards:boards(name)')
      .eq('workspace_id', workspaceId)
      .not('date_start', 'is', null)
      .not('date_end', 'is', null);
      
    if (simpleError) {
      console.log('❌ Simplified query error:', simpleError);
    } else {
      console.log('✅ Simplified query success:', simpleData?.length || 0, 'cards');
      if (simpleData && simpleData.length > 0) {
        console.log('📊 Sample data:', JSON.stringify(simpleData[0], null, 2));
      }
    }
  } else {
    console.log('✅ Full query success:', data?.length || 0, 'cards');
    if (data && data.length > 0) {
      console.log('📊 Sample card structure:');
      console.log('  - ID:', data[0].id);
      console.log('  - Title:', data[0].title);
      console.log('  - Date Start:', data[0].date_start);
      console.log('  - Date End:', data[0].date_end);
      console.log('  - Board ID:', data[0].board_id);
      console.log('  - Boards relation:', data[0].boards);
      
      // Show what the calendar transform would produce
      const transformed = data.map(card => ({
        id: card.id,
        title: card.title,
        startDate: new Date(card.date_start),
        endDate: new Date(card.date_end),
        boardName: card.boards?.name || 'Unknown Board',
        boardId: card.board_id,
      }));
      
      console.log('\n🔄 Transformed for calendar:', transformed);
    }
  }
}

testCalendarQuery().catch(console.error);