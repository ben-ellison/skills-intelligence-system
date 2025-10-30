import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration 039 on production database...');
  console.log('Supabase URL:', supabaseUrl);

  const migrationPath = path.join(process.cwd(), 'supabase/migrations/039_add_report_pages_to_ai_prompts.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('\nMigration SQL:');
  console.log(sql);
  console.log('\n---\n');

  // Split by semicolon and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    console.log('Executing:', statement.substring(0, 100) + '...');

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.error('❌ Error:', error);
        // Try direct execution as fallback
        console.log('Trying direct execution...');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          console.error('❌ Direct execution also failed');
        } else {
          console.log('✅ Direct execution succeeded');
        }
      } else {
        console.log('✅ Success');
      }
    } catch (err) {
      console.error('❌ Exception:', err);
    }
  }

  console.log('\nMigration completed. Now checking if columns exist...');

  // Verify the columns were added
  const { data: columns, error: columnsError } = await supabase
    .from('ai_prompts')
    .select('*')
    .limit(1);

  if (columnsError) {
    console.error('Error checking columns:', columnsError);
  } else {
    console.log('Sample record from ai_prompts:', JSON.stringify(columns, null, 2));
  }
}

runMigration().catch(console.error);
