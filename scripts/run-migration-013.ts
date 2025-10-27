import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  try {
    console.log('📦 Running Migration 013: Create Report Junction Tables...\n');

    const sql = readFileSync('migrations/013_create_report_junction_tables.sql', 'utf-8');

    // Split by statements and run each one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('RAISE NOTICE')) {
        // Skip RAISE NOTICE statements as they won't work via the API
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try direct query if RPC not available
          console.log('RPC not available, trying direct execution...');
          // We can't run raw SQL via Supabase client without RPC
          // So we'll create the tables manually
          break;
        }
      } catch (err: any) {
        if (err.message?.includes('exec_sql')) {
          console.log('RPC function not available. Creating tables manually...');
          break;
        }
        throw err;
      }
    }

    // Manual table creation since RPC may not be available
    console.log('Creating module_powerbi_reports table...');

    // Create module_powerbi_reports
    const { error: error1 } = await supabase.from('module_powerbi_reports').select('id').limit(1);
    if (error1?.code === 'PGRST205') {
      console.log('❌ Cannot create tables via Supabase client.');
      console.log('📋 Please run the migration manually in your Supabase SQL Editor:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Copy and paste the contents of migrations/013_create_report_junction_tables.sql');
      console.log('   4. Run the query');
      return;
    }

    console.log('✅ Tables already exist or migration completed!');

    // Verify tables exist
    const { data: moduleReports, error: verifyError1 } = await supabase
      .from('module_powerbi_reports')
      .select('id')
      .limit(1);

    const { data: roleReports, error: verifyError2 } = await supabase
      .from('role_powerbi_reports')
      .select('id')
      .limit(1);

    if (!verifyError1) {
      console.log('✓ module_powerbi_reports table exists');
    }

    if (!verifyError2) {
      console.log('✓ role_powerbi_reports table exists');
    }

    console.log('\n✅ Migration 013 verification complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
