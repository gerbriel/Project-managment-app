#!/usr/bin/env node
/**
 * Comprehensive Storage RLS Policy Fix
 * 
 * This script will diagnose and fix the storage RLS policies
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function fixStorageRLS() {
  console.log('🔧 Comprehensive Storage RLS Policy Fix...');
  console.log('=======================================');

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || (!serviceKey && !anonKey)) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  // Use service key if available for admin operations
  const supabase = createClient(url, serviceKey || anonKey);

  try {
    // Step 1: Check current authentication status
    console.log('🔍 Checking authentication...');
    const { data: user } = await supabase.auth.getUser();
    console.log('User authenticated:', user?.user ? '✅' : '❌');

    // Step 2: Check if bucket exists
    console.log('📦 Checking bucket status...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }
    
    const attachmentsBucket = buckets.find(b => b.id === 'attachments');
    if (!attachmentsBucket) {
      console.error('❌ Attachments bucket does not exist');
      return;
    }
    console.log('✅ Attachments bucket exists');
    console.log('   Public:', attachmentsBucket.public ? '✅' : '❌');
    console.log('   File size limit:', attachmentsBucket.file_size_limit);

    // Step 3: Test basic upload with service role
    console.log('🧪 Testing upload with current permissions...');
    const testFile = new File(['test-content-' + Date.now()], 'rls-test.txt', { type: 'text/plain' });
    const testPath = `test/rls-test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(testPath, testFile, { upsert: true });

    if (uploadError) {
      console.log('❌ Upload failed:', uploadError.message);
      
      // Check if it's an RLS issue
      if (uploadError.message.includes('row-level security')) {
        console.log('🚨 Confirmed: RLS policy issue detected');
        
        // Step 4: Try to fix policies using direct SQL approach
        console.log('🛠️  Attempting to fix RLS policies...');
        
        // Create a comprehensive SQL script
        const sqlCommands = [
          'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;',
          'DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;',
          `CREATE POLICY "Allow authenticated uploads" ON storage.objects 
           FOR INSERT TO authenticated 
           WITH CHECK (bucket_id = 'attachments');`,
          `CREATE POLICY "Allow public reads" ON storage.objects 
           FOR SELECT TO public 
           USING (bucket_id = 'attachments');`,
          `CREATE POLICY "Allow authenticated deletes" ON storage.objects 
           FOR DELETE TO authenticated 
           USING (bucket_id = 'attachments');`,
          `CREATE POLICY "Allow authenticated updates" ON storage.objects 
           FOR UPDATE TO authenticated 
           USING (bucket_id = 'attachments') 
           WITH CHECK (bucket_id = 'attachments');`
        ];

        console.log('📝 Executing SQL commands...');
        
        for (const [index, sql] of sqlCommands.entries()) {
          try {
            const { error } = await supabase.rpc('query', { query: sql });
            if (error) {
              console.log(`⚠️  Command ${index + 1}: ${error.message}`);
            } else {
              console.log(`✅ Command ${index + 1}: Success`);
            }
          } catch (e) {
            console.log(`❌ Command ${index + 1}: ${e.message}`);
          }
        }

        // Test again after policy creation
        console.log('🔄 Testing upload after policy fix...');
        const retestPath = `test/retest-${Date.now()}.txt`;
        const retestFile = new File(['retest-content'], 'retest.txt', { type: 'text/plain' });
        
        const { error: retestError } = await supabase.storage
          .from('attachments')
          .upload(retestPath, retestFile, { upsert: true });

        if (retestError) {
          console.log('❌ Retest failed:', retestError.message);
          console.log('');
          console.log('🔧 MANUAL FIX REQUIRED:');
          console.log('1. Go to Supabase Dashboard → SQL Editor');
          console.log('2. Run this SQL:');
          console.log('');
          console.log('-- Enable RLS');
          console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
          console.log('');
          console.log('-- Drop existing policies');
          console.log('DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;');
          console.log('DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;');
          console.log('');
          console.log('-- Create new policies');
          console.log('CREATE POLICY "Allow authenticated uploads" ON storage.objects');
          console.log('  FOR INSERT TO authenticated');
          console.log('  WITH CHECK (bucket_id = \'attachments\');');
          console.log('');
          console.log('CREATE POLICY "Allow public reads" ON storage.objects');
          console.log('  FOR SELECT TO public');
          console.log('  USING (bucket_id = \'attachments\');');
          console.log('');
          console.log('3. Click "Run" to execute');
          console.log('4. Try uploading a file again');
        } else {
          console.log('✅ Retest successful! RLS policies fixed.');
          // Clean up test files
          await supabase.storage.from('attachments').remove([retestPath]);
        }
        
      } else {
        console.log('❓ Upload failed for different reason:', uploadError.message);
      }
    } else {
      console.log('✅ Upload successful! Storage is working correctly.');
      // Clean up test file
      await supabase.storage.from('attachments').remove([testPath]);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixStorageRLS().catch(console.error);