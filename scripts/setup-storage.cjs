#!/usr/bin/env node
/**
 * Setup Supabase Storage Bucket for Attachments
 * 
 * This script creates the 'attachments' storage bucket in Supabase
 * and sets up the necessary RLS policies.
 * 
 * Usage: node scripts/setup-storage.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function setupStorage() {
  console.log('🚀 Setting up Supabase storage bucket...');

  // Get Supabase credentials
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('🔍 Environment check:');
  console.log('  URL:', url ? '✅ Found' : '❌ Missing');
  console.log('  Service Key:', serviceKey ? '✅ Found' : '❌ Missing');
  console.log('  Anon Key:', anonKey ? '✅ Found' : '❌ Missing');

  if (!url) {
    console.error('❌ Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable');
    process.exit(1);
  }

  // Use service role key if available, otherwise anon key
  const key = serviceKey || anonKey;
  if (!key) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY environment variable');
    process.exit(1);
  }

  try {
    const supabase = createClient(url, key);
    console.log('✅ Connected to Supabase');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      process.exit(1);
    }

    const attachmentsBucket = buckets.find(bucket => bucket.id === 'attachments');
    
    if (attachmentsBucket) {
      console.log('✅ Attachments bucket already exists');
    } else {
      console.log('📦 Creating attachments bucket...');
      
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('attachments', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          'application/pdf', 
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'text/csv',
          'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
        ]
      });

      if (error) {
        console.error('❌ Error creating bucket:', error);
        process.exit(1);
      }

      console.log('✅ Attachments bucket created successfully');
    }

    // Test upload functionality
    console.log('🧪 Testing upload functionality...');
    
    // First, let's try to set up RLS policies via SQL
    console.log('🔒 Setting up RLS policies...');
    
    const rlsPolicies = `
      -- Enable RLS on storage.objects if not already enabled
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist to avoid conflicts
      DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      
      -- Create new policies for attachments bucket
      CREATE POLICY "Allow authenticated uploads" ON storage.objects
        FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'attachments');
      
      CREATE POLICY "Allow authenticated reads" ON storage.objects
        FOR SELECT 
        TO authenticated 
        USING (bucket_id = 'attachments');
        
      CREATE POLICY "Allow public reads" ON storage.objects
        FOR SELECT 
        TO public 
        USING (bucket_id = 'attachments');
      
      CREATE POLICY "Allow authenticated deletes" ON storage.objects
        FOR DELETE 
        TO authenticated 
        USING (bucket_id = 'attachments');
      
      CREATE POLICY "Allow authenticated updates" ON storage.objects
        FOR UPDATE 
        TO authenticated 
        USING (bucket_id = 'attachments')
        WITH CHECK (bucket_id = 'attachments');
    `;
    
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsPolicies });
      if (rlsError) {
        console.log('⚠️  RLS setup via RPC failed, trying direct SQL execution...');
        // Try individual policy creation
        await supabase.rpc('exec_sql', { 
          sql: "CREATE POLICY IF NOT EXISTS \"Allow public access\" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments');" 
        });
      } else {
        console.log('✅ RLS policies configured');
      }
    } catch (rpcError) {
      console.log('⚠️  Could not set RLS policies programmatically');
      console.log('💡 You will need to run the SQL script manually: scripts/setup-storage.sql');
    }

    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload('test/test.txt', testFile, { upsert: true });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      console.log('💡 You may need to set up RLS policies manually in the Supabase dashboard');
      console.log('💡 Or run the SQL script: scripts/setup-storage.sql');
    } else {
      console.log('✅ Test upload successful');
      
      // Clean up test file
      await supabase.storage.from('attachments').remove(['test/test.txt']);
      console.log('🧹 Test file cleaned up');
    }

    console.log('🎉 Storage setup complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. If test upload failed, run the SQL script in Supabase dashboard:');
    console.log('   scripts/setup-storage.sql');
    console.log('2. Restart your development server');
    console.log('3. Try uploading files again');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
setupStorage().catch(console.error);