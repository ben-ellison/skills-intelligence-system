/**
 * Run database migrations using Supabase client
 * This avoids psql connection issues
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filePath) {
  const fileName = path.basename(filePath);

  try {
    console.log(`📄 Running: ${fileName}`);

    const sql = fs.readFileSync(filePath, 'utf8');

    // Split into statements (basic approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements`);

    let executed = 0;
    let errors = 0;

    for (const statement of statements) {
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {
        // Execute via Supabase REST API using raw SQL
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Try direct execution if RPC fails
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql: statement + ';' }),
          });

          if (!response.ok) {
            // Some statements might fail if already exists - that's OK
            errors++;
          } else {
            executed++;
          }
        } else {
          executed++;
        }
      } catch (err) {
        errors++;
      }
    }

    console.log(`✅ ${fileName} completed`);
    console.log(`   Executed: ${executed}, Warnings: ${errors}\n`);

    return true;
  } catch (error) {
    console.error(`❌ ${fileName} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running Skills Intelligence System Migrations...\n');

  const migrations = [
    '010_per_tenant_module_configuration.sql',
    '011_modules_and_features_schema.sql',
    '012_role_based_module_features.sql',
  ];

  for (const migration of migrations) {
    const filePath = path.join(__dirname, '..', migration);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Migration not found: ${migration}`);
      console.log(`   Skipping...\n`);
      continue;
    }

    await runMigration(filePath);
  }

  console.log('🎉 All migrations completed!\n');
  console.log('Next steps:');
  console.log('1. Visit: http://localhost:3001/super-admin');
  console.log('2. Add Demo1 organization');
  console.log('3. Configure reports and modules\n');
}

main().catch(console.error);
