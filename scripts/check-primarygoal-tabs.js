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

async function checkTabs() {
  console.log('Checking tabs for PrimaryGoal organization...\n');

  // Get PrimaryGoal organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('subdomain', 'primarygoal')
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    return;
  }

  if (!org) {
    console.log('PrimaryGoal organization not found');
    return;
  }

  console.log('Organization:', org);
  console.log('\n---\n');

  // Get tabs for this organization
  const { data: tabs, error: tabsError } = await supabase
    .from('tabs')
    .select('*')
    .eq('organization_id', org.id)
    .order('module_name')
    .order('display_order');

  if (tabsError) {
    console.error('Error fetching tabs:', tabsError);
    return;
  }

  console.log(`Found ${tabs.length} tabs:`);

  // Group by module
  const byModule = {};
  tabs.forEach(tab => {
    if (!byModule[tab.module_name]) {
      byModule[tab.module_name] = [];
    }
    byModule[tab.module_name].push(tab);
  });

  Object.keys(byModule).sort().forEach(moduleName => {
    console.log(`\n${moduleName}:`);
    byModule[moduleName].forEach(tab => {
      console.log(`  [${tab.display_order}] ${tab.name} (${tab.id.substring(0, 8)}...)`);
    });
  });

  // Check for duplicates
  console.log('\n---\nChecking for duplicates...\n');
  const tabNames = {};
  tabs.forEach(tab => {
    const key = `${tab.module_name}:${tab.name}`;
    if (!tabNames[key]) {
      tabNames[key] = [];
    }
    tabNames[key].push(tab);
  });

  Object.keys(tabNames).forEach(key => {
    if (tabNames[key].length > 1) {
      console.log(`❌ DUPLICATE: ${key}`);
      tabNames[key].forEach(tab => {
        console.log(`   - ID: ${tab.id}, Order: ${tab.display_order}`);
      });
    }
  });
}

checkTabs().catch(console.error);
