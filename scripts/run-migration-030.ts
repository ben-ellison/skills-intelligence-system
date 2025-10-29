import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read the migration file
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '030_fix_sidebar_module_ordering.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration 030: Fix sidebar module ordering...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_').select('*').limit(0);

      // Split migration into statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await (supabase as any).rpc('query', {
          query: statement + ';'
        });

        if (stmtError) {
          console.error('❌ Error executing statement:', stmtError);
          throw stmtError;
        }
      }
    }

    console.log('\n✅ Migration 030 completed successfully!');
    console.log('✓ Updated get_modules_for_organization() to exclude orphaned tenant modules');
    console.log('✓ Sidebar should now display modules in correct sort_order');
    console.log('\n📝 Next steps:');
    console.log('1. Go to demo1.skillsintelligencesystem.co.uk');
    console.log('2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('3. Verify sidebar shows modules in correct order');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n📝 Manual fix required:');
    console.error('Go to Supabase Dashboard > SQL Editor and run the migration manually');
    console.error('Migration file: supabase/migrations/030_fix_sidebar_module_ordering.sql');
    process.exit(1);
  }
}

runMigration();
