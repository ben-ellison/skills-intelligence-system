import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking users table schema...\n');

  try {
    // Get one user to see the structure
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (users && users.length > 0) {
      console.log('✅ Users table columns:');
      console.log(Object.keys(users[0]).join(', '));
      console.log('\n📋 Sample user:');
      console.log(JSON.stringify(users[0], null, 2));
    }

    // Check organizations table
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (!orgError && orgs && orgs.length > 0) {
      console.log('\n✅ Organizations table columns:');
      console.log(Object.keys(orgs[0]).join(', '));
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkSchema();
