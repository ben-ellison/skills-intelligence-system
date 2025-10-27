/**
 * Script to run migration 009_provider_code_matching.sql
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📖 Reading migration file...');
    const sql = fs.readFileSync('./009_provider_code_matching.sql', 'utf8');

    console.log('🚀 Running migration 009_provider_code_matching.sql...');

    // Split into individual statements (rough approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    let executed = 0;
    let failed = 0;

    for (const statement of statements) {
      try {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.trim() === '') {
          continue;
        }

        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

        if (error) {
          // Try direct execution if RPC fails
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ sql_query: statement + ';' }),
          });

          if (!response.ok) {
            console.warn(`⚠️  Statement failed (may already exist):`, statement.substring(0, 100) + '...');
            failed++;
          } else {
            executed++;
          }
        } else {
          executed++;
        }
      } catch (err) {
        console.warn(`⚠️  Error executing statement:`, err.message);
        failed++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Executed: ${executed} statements`);
    console.log(`   Warnings: ${failed} statements`);

    // Test the parsing function
    console.log('\n🧪 Testing parse_report_name function...');
    const { data: testResult, error: testError } = await supabase
      .rpc('parse_report_name', { report_name: 'APTEM-BKSB-HUBSPOT - Operations Leader v1.2' });

    if (testError) {
      console.error('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Parse function works!');
      console.log('   Result:', testResult);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

runMigration();
