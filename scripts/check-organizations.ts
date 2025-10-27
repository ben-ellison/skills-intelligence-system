import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrganizations() {
  console.log('🔍 Checking existing organizations...\n');

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, subdomain, powerbi_workspace_id, powerbi_workspace_name')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${orgs.length} organization(s):\n`);

  for (const org of orgs) {
    console.log(`📁 ${org.name}`);
    console.log(`   Subdomain: ${org.subdomain}.skillsintelligencesystem.co.uk`);
    console.log(`   ID: ${org.id}`);
    if (org.powerbi_workspace_id) {
      console.log(`   PowerBI Workspace: ${org.powerbi_workspace_name || 'N/A'}`);
      console.log(`   Workspace ID: ${org.powerbi_workspace_id}`);
    } else {
      console.log(`   PowerBI Workspace: Not configured`);
    }
    console.log('');
  }
}

checkOrganizations();
