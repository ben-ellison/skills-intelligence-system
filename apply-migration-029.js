const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ytknzkfdyvuwazoigisd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0a256a2ZkeXZ1d2F6b2lnaXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE3ODc5NSwiZXhwIjoyMDc2NzU0Nzk1fQ.gDaFVCOAL1hcgvCQlL3o3Jz8nkzEEe4YhJsFP6ISsdM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const migration = fs.readFileSync('./supabase/migrations/029_fix_duplicate_tabs.sql', 'utf8');
    
    console.log('Applying migration 029: Fix duplicate tabs...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migration
    });
    
    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }
    
    console.log('✓ Migration 029 applied successfully!');
  } catch (err) {
    console.error('Failed to apply migration:', err.message);
    process.exit(1);
  }
}

applyMigration();
