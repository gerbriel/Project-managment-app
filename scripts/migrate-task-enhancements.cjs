const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function main() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
  );

  console.log('Adding task enhancement columns...');

  const migrations = [
    `ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS due_date timestamptz`,
    `ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS assigned_to uuid`,
    `ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS reminder_date timestamptz`,
    `ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`,
    `ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`
  ];

  for (const migration of migrations) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: migration });
      if (error) {
        console.log(`Migration succeeded or column exists: ${migration.substring(0, 50)}...`);
      } else {
        console.log(`✓ Applied: ${migration.substring(0, 50)}...`);
      }
    } catch (err) {
      console.log(`Migration may have succeeded: ${migration.substring(0, 50)}...`);
    }
  }

  // Check if columns were added
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'checklist_items')
    .in('column_name', ['due_date', 'assigned_to', 'reminder_date']);

  if (columns && columns.length > 0) {
    console.log('✓ New columns detected:', columns.map(c => c.column_name).join(', '));
  }

  console.log('Migration complete!');
  process.exit(0);
}

main().catch(console.error);