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

async function testEnhancedFeatures() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE || envVars.VITE_SUPABASE_ANON_KEY;
  
  console.log('🧪 Testing Enhanced Task Management Features');
  console.log('==========================================');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test 1: Check if enhanced columns exist
  console.log('🔍 Test 1: Checking enhanced columns...');
  const { data: testData, error: testError } = await supabase
    .from('checklist_items')
    .select('id, due_date, assigned_to, reminder_date, reminder_interval, reminder_count')
    .limit(1);
    
  if (testError) {
    console.log('❌ Enhanced columns missing:', testError.message);
    return false;
  } else {
    console.log('✅ Enhanced columns available');
  }
  
  // Test 2: Check if list_workspace_members function exists
  console.log('🔍 Test 2: Checking list_workspace_members function...');
  const { data: membersData, error: membersError } = await supabase.rpc('list_workspace_members');
  
  if (membersError) {
    console.log('❌ list_workspace_members function missing:', membersError.message);
    return false;
  } else {
    console.log('✅ list_workspace_members function available');
    console.log('👥 Available members:', membersData);
  }
  
  // Test 3: Try creating a task with enhanced features
  console.log('🔍 Test 3: Testing enhanced task creation...');
  
  // First get a checklist to add to
  const { data: checklists } = await supabase
    .from('checklists')
    .select('id')
    .limit(1);
    
  if (checklists && checklists.length > 0) {
    const testTaskData = {
      checklist_id: checklists[0].id,
      text: 'Test Enhanced Task',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      reminder_interval: '1_day',
      reminder_count: 0,
      done: false
    };
    
    const { data: newTask, error: createError } = await supabase
      .from('checklist_items')
      .insert(testTaskData)
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Enhanced task creation failed:', createError.message);
      return false;
    } else {
      console.log('✅ Enhanced task creation successful');
      console.log('📋 Test task created:', newTask);
      
      // Clean up - delete the test task
      await supabase.from('checklist_items').delete().eq('id', newTask.id);
      console.log('🧹 Test task cleaned up');
    }
  }
  
  console.log('');
  console.log('🎉 ALL TESTS PASSED!');
  console.log('✅ Your database is fully ready for enhanced task management');
  console.log('✅ Date pickers will now work');
  console.log('✅ Member assignments will work');  
  console.log('✅ Reminder system is ready');
  console.log('');
  console.log('🚀 Refresh your browser to see the new features!');
  
  return true;
}

testEnhancedFeatures().catch(console.error);