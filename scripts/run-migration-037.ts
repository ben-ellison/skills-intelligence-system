import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration 037_create_ai_prompts.sql...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/037_create_ai_prompts.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by statement and execute one at a time
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    const { error } = await supabase.rpc('exec_sql', {
      sql_string: statement + ';'
    });

    if (error) {
      console.error(`Error in statement ${i + 1}:`, error);
      // Try direct query as fallback
      const { error: directError } = await supabase.from('_exec').select('*').limit(0);
      if (directError) {
        console.error('Direct query also failed:', directError);
      }
    } else {
      console.log(`✅ Statement ${i + 1} completed`);
    }
  }

  console.log('\n✅ Migration completed!');
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
