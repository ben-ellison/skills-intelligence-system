import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function checkDatabase() {
  console.log('🔍 Checking database state after migrations...\n');

  // Try to query existing tables
  const tables = [
    'organizations',
    'roles',
    'users',
    'powerbi_reports',
    'organization_powerbi_reports',
    'modules',
    'module_features',
    'organization_modules',
    'organization_module_features',
    'role_module_features'
  ];

  let successCount = 0;
  let failCount = 0;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        console.log(`❌ ${table}: Does not exist or error - ${error.message}`);
        failCount++;
      } else {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`✅ ${table}: Exists (${count} rows)`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ ${table}: Error checking - ${err}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount}/${tables.length} tables exist`);

  if (failCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Visit: http://localhost:3001/super-admin');
    console.log('2. Add Demo1 organization');
    console.log('3. Configure reports and modules');
  } else {
    console.log(`\n⚠️  ${failCount} table(s) missing. Please run migrations in Supabase SQL Editor.`);
    console.log('See MIGRATION_INSTRUCTIONS.md for details.');
  }
}

checkDatabase().catch(console.error);
