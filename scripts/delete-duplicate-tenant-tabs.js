const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteDuplicateTenantTabs() {
  console.log('Finding and deleting duplicate tenant tabs...\n');

  // Get PrimaryGoal organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, subdomain')
    .eq('subdomain', 'primarygoal')
    .single();

  if (orgError || !org) {
    console.error('Error fetching PrimaryGoal organization:', orgError);
    return;
  }

  console.log(`Found organization: ${org.name} (${org.id})`);

  // Get all tenant tabs for this organization
  const { data: tenantTabs, error: tabsError } = await supabase
    .from('tenant_module_tabs')
    .select('*')
    .eq('organization_id', org.id);

  if (tabsError) {
    console.error('Error fetching tenant tabs:', tabsError);
    return;
  }

  console.log(`\nFound ${tenantTabs.length} tenant tabs`);

  if (tenantTabs.length === 0) {
    console.log('No tenant tabs to delete');
    return;
  }

  console.log('Tenant tabs:');
  tenantTabs.forEach(tab => {
    console.log(`  - ${tab.tab_name} (override_mode: ${tab.override_mode})`);
  });

  // Delete all tenant tabs with override_mode='add'
  // These are duplicates of global tabs that shouldn't have been created
  const { data: deleted, error: deleteError } = await supabase
    .from('tenant_module_tabs')
    .delete()
    .eq('organization_id', org.id)
    .eq('override_mode', 'add')
    .select();

  if (deleteError) {
    console.error('\n❌ Error deleting tenant tabs:', deleteError);
    return;
  }

  console.log(`\n✓ Deleted ${deleted.length} duplicate tenant tabs`);
  deleted.forEach(tab => {
    console.log(`  - ${tab.tab_name}`);
  });
}

deleteDuplicateTenantTabs().catch(console.error);
