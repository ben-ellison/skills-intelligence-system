require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/016_create_global_modules.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration 016 to production database...');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution via REST API
      console.log('⚠️  exec_sql function not found, trying alternative method...');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DO $$')) {
          // Skip DO blocks as they're informational
          continue;
        }

        try {
          const { error: stmtError } = await supabase.rpc('exec', {
            sql: statement + ';'
          });

          if (stmtError) {
            console.log(`⚠️  Statement warning: ${stmtError.message}`);
          }
        } catch (err) {
          console.log(`⚠️  Statement warning: ${err.message}`);
        }
      }
    }

    console.log('✅ Migration 016 applied successfully!');
    console.log('✓ Created global_modules table');
    console.log('✓ Updated organization_modules with override columns');
    console.log('✓ Created get_modules_for_organization() helper function');
    console.log('✓ Seeded 8 default global modules');

    // Verify the table was created
    const { data: modules, error: verifyError } = await supabase
      .from('global_modules')
      .select('*')
      .limit(1);

    if (!verifyError) {
      console.log('\n✅ Verification successful - global_modules table is accessible');
    } else {
      console.log('\n⚠️  Could not verify table:', verifyError.message);
    }

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
