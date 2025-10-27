import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

async function runMigrationFile(filename: string) {
  console.log(`\n📄 Running: ${filename}`);

  const migrationPath = path.join(process.cwd(), filename);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Use fetch to call Supabase's PostgREST API directly with raw SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ sql: migrationSQL })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ ${filename} failed:`, error);
    return false;
  }

  console.log(`✅ ${filename} completed successfully`);
  return true;
}

async function runMigrations() {
  console.log('🚀 Running Skills Intelligence System Migrations...\n');

  const migrations = [
    '011_modules_and_features_schema.sql',
    '010_per_tenant_module_configuration.sql',
    '012_role_based_module_features.sql'
  ];

  for (const migration of migrations) {
    const success = await runMigrationFile(migration);
    if (!success) {
      console.error('\n❌ Migration process stopped due to error');
      process.exit(1);
    }
  }

  console.log('\n🎉 All migrations completed successfully!\n');
  console.log('Next steps:');
  console.log('1. Visit: http://localhost:3001/super-admin');
  console.log('2. Add Demo1 organization');
  console.log('3. Configure reports and modules');
}

runMigrations().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
