// Debug script to check authentication and database access
// Run with: node scripts/debug-auth.cjs

require('dotenv').config();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const demoEmail = process.env.VITE_DEMO_EMAIL;
  const demoPassword = process.env.VITE_DEMO_PASSWORD;
  
  console.log('Environment check:');
  console.log('- VITE_SUPABASE_URL:', url ? '✓ Set' : '✗ Missing');
  console.log('- VITE_SUPABASE_ANON_KEY:', anonKey ? '✓ Set' : '✗ Missing');
  console.log('- VITE_DEMO_EMAIL:', demoEmail ? '✓ Set' : '✗ Missing');
  console.log('- VITE_DEMO_PASSWORD:', demoPassword ? '✓ Set' : '✗ Missing');
  
  if (!url || !anonKey) {
    console.log('\n❌ Missing required Supabase credentials');
    return;
  }
  
  console.log('\nConnecting to Supabase...');
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false }
  });
  
  try {
    // Check if we can connect
    console.log('Testing connection...');
    
    // Try to sign in with demo credentials if available
    if (demoEmail && demoPassword) {
      console.log('Signing in with demo credentials...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword
      });
      
      if (authError) {
        console.log('❌ Demo sign-in failed:', authError.message);
      } else if (authData.user) {
        console.log('✅ Successfully signed in as:', authData.user.email);
        console.log('User ID:', authData.user.id);
        
        // Test workspace access
        console.log('\nTesting workspace access...');
        const { data: workspaces, error: wsError } = await supabase
          .from('workspaces')
          .select('id, name')
          .limit(5);
          
        if (wsError) {
          console.log('❌ Workspace query failed:', wsError.message);
        } else {
          console.log('✅ Found workspaces:', workspaces.length);
          workspaces.forEach(ws => console.log(`  - ${ws.name} (${ws.id})`));
        }
        
        // Test boards access
        console.log('\nTesting boards access...');
        const { data: boards, error: boardError } = await supabase
          .from('boards')
          .select('id, name, workspace_id')
          .limit(5);
          
        if (boardError) {
          console.log('❌ Board query failed:', boardError.message);
        } else {
          console.log('✅ Found boards:', boards.length);
          boards.forEach(board => console.log(`  - ${board.name} (${board.id})`));
        }
        
        // Test cards access
        console.log('\nTesting cards access...');
        const { data: cards, error: cardError } = await supabase
          .from('cards')
          .select('id, title, board_id, list_id')
          .limit(5);
          
        if (cardError) {
          console.log('❌ Card query failed:', cardError.message);
        } else {
          console.log('✅ Found cards:', cards.length);
          cards.forEach(card => console.log(`  - ${card.title} (${card.id})`));
        }
        
      }
    } else {
      console.log('⚠️ No demo credentials - testing anonymous access');
      
      // Test anonymous access
      const { data: publicData, error: publicError } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1);
        
      if (publicError) {
        console.log('❌ Anonymous access failed:', publicError.message);
        console.log('This is expected if RLS is properly configured');
      } else {
        console.log('⚠️ Anonymous access succeeded - RLS may not be properly configured');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\nDone!');
}

main().catch(console.error);