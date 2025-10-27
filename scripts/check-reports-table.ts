import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkReportsTable() {
  console.log('🔍 Checking organization_powerbi_reports table schema...\n');

  // Try to select with all possible columns
  const { data, error } = await supabase
    .from('organization_powerbi_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Table exists with columns:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\n📋 Sample data:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('✅ Table exists but is empty');
    console.log('\nTrying to get table structure...');

    // Try an insert that will fail to see what columns are expected
    const { error: insertError } = await supabase
      .from('organization_powerbi_reports')
      .insert({ test: 'test' });

    console.log('\nInsert error (expected):', insertError);
  }
}

checkReportsTable();
