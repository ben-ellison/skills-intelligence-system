import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Running Skills Intelligence System Migrations...\n');

  // Read the consolidated migration file
  const migrationPath = path.join(process.cwd(), 'MIGRATIONS_CORRECT_ORDER.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Running: MIGRATIONS_CORRECT_ORDER.sql');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully\n');
    console.log('Next steps:');
    console.log('1. Visit: http://localhost:3001/super-admin');
    console.log('2. Add Demo1 organization');
    console.log('3. Configure reports and modules');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

runMigrations();
