#!/usr/bin/env node
/**
 * Fix Storage RLS Policies
 * 
 * This script directly executes SQL to fix the RLS policies for file uploads
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function fixStoragePolicies() {
  console.log('🔧 Fixing Supabase storage RLS policies...');

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || (!serviceKey && !anonKey)) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey || anonKey);

  try {
    // Drop and recreate policies one by one
    console.log('🗑️  Dropping existing policies...');
    
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;',
      'DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;',
      'DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;',
      'DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;',
      'DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;',
      'DROP POLICY IF EXISTS "Public Access" ON storage.objects;'
    ];

    for (const sql of dropPolicies) {
      try {
        await supabase.rpc('exec_sql', { sql });
      } catch (e) {
        // Ignore errors when dropping non-existent policies
      }
    }

    console.log('📝 Creating new policies...');

    // Create policies with explicit SQL
    const createPolicies = [
      `CREATE POLICY "Allow authenticated uploads" ON storage.objects 
       FOR INSERT TO authenticated 
       WITH CHECK (bucket_id = 'attachments');`,
       
      `CREATE POLICY "Allow public reads" ON storage.objects 
       FOR SELECT TO public 
       USING (bucket_id = 'attachments');`,
       
      `CREATE POLICY "Allow authenticated deletes" ON storage.objects 
       FOR DELETE TO authenticated 
       USING (bucket_id = 'attachments');`
    ];

    let policySuccess = 0;
    for (const [index, sql] of createPolicies.entries()) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (!error) {
          policySuccess++;
          console.log(`✅ Policy ${index + 1}/3 created`);
        } else {
          console.log(`⚠️  Policy ${index + 1}/3 had issues:`, error.message);
        }
      } catch (e) {
        console.log(`⚠️  Policy ${index + 1}/3 failed:`, e.message);
      }
    }

    // Test upload with current user authentication
    console.log('🧪 Testing upload with authentication...');
    
    const testFile = new File(['test-content-' + Date.now()], 'auth-test.txt', { type: 'text/plain' });
    const testPath = `test/auth-test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(testPath, testFile, { upsert: true });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError.message);
      console.log('');
      console.log('🔧 Manual fix required:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to Authentication > Policies');
      console.log('3. Find the storage.objects table');
      console.log('4. Create a policy:');
      console.log('   - Name: "Allow authenticated uploads"');
      console.log('   - Operation: INSERT');
      console.log('   - Target roles: authenticated');
      console.log('   - USING expression: bucket_id = \'attachments\'');
      console.log('');
      console.log('Or run this SQL in the SQL Editor:');
      console.log('scripts/setup-storage.sql');
    } else {
      console.log('✅ Test upload successful!');
      
      // Clean up test file
      await supabase.storage.from('attachments').remove([testPath]);
      console.log('🧹 Test file cleaned up');
    }

    console.log('');
    console.log(`📊 Summary: ${policySuccess}/3 policies created successfully`);
    
    if (policySuccess === 3 && !uploadError) {
      console.log('🎉 Storage RLS policies fixed! File uploads should work now.');
    } else {
      console.log('⚠️  Some issues remain. You may need to configure policies manually.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixStoragePolicies().catch(console.error);