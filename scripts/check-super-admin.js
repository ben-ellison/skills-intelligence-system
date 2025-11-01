const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSuperAdmin() {
  // Get all organizations
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, subdomain, created_at')
    .order('created_at', { ascending: true });

  if (orgError) {
    console.error('Error fetching organizations:', orgError);
    return;
  }

  console.log('\n=== ALL ORGANIZATIONS ===');
  orgs.forEach((org, i) => {
    console.log(`${i + 1}. ${org.name} (${org.subdomain})`);
    console.log(`   ID: ${org.id}`);
    console.log(`   Created: ${new Date(org.created_at).toLocaleString()}\n`);
  });

  // Get super admin user
  const { data: user } = await supabase
    .from('users')
    .select('id, email, organization_id, is_super_admin, is_tenant_admin')
    .eq('email', 'ben.ellison@edvanceiq.co.uk')
    .single();

  console.log('=== SUPER ADMIN USER ===');
  if (user) {
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Organization ID: ${user.organization_id}`);
    console.log(`Is Super Admin: ${user.is_super_admin}`);
    console.log(`Is Tenant Admin: ${user.is_tenant_admin}`);

    // Find which org they belong to
    const currentOrg = orgs.find(o => o.id === user.organization_id);
    if (currentOrg) {
      console.log(`Current Organization: ${currentOrg.name} (${currentOrg.subdomain})`);
    } else {
      console.log('WARNING: organization_id does not match any organization!');
    }
  } else {
    console.log('User not found!');
  }

  console.log('\n=== RECOMMENDATION ===');
  if (orgs.length > 0) {
    const demoOrg = orgs.find(o => o.subdomain === 'demo') || orgs[0];
    console.log(`Set super admin's organization_id to your main organization:`);
    console.log(`Organization: ${demoOrg.name} (${demoOrg.subdomain})`);
    console.log(`ID: ${demoOrg.id}`);
  }
}

checkSuperAdmin().catch(console.error);
