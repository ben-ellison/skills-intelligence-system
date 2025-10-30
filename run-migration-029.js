const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ytknzkfdyvuwazoigisd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0a256a2ZkeXZ1d2F6b2lnaXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE3ODc5NSwiZXhwIjoyMDc2NzU0Nzk1fQ.gDaFVCOAL1hcgvCQlL3o3Jz8nkzEEe4YhJsFP6ISsdM';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const sql = fs.readFileSync('./supabase/migrations/029_fix_duplicate_tabs.sql', 'utf8');
    
    console.log('Executing migration 029: Fix duplicate tabs...');
    
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }
    
    console.log('✓ Migration executed successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

runMigration();
