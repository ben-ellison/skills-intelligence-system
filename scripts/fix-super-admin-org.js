const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jbxtwhkbqzbpcnhnqgbl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpieHR3aGticXpicGNuaG5xZ2JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzkzOTUzNSwiZXhwIjoyMDQ5NTE1NTM1fQ.jdmEPHcUNKJzx8q0LsJFuXU1-t3Ss0DHRXoD0e9UWJo'
);

async function fixSuperAdmin() {
  const superAdminEmail = 'ben.ellison@edvanceiq.co.uk';
  const mainOrgSubdomain = 'demo1';

  console.log(`\nFixing super admin assignment...`);
  console.log(`Email: ${superAdminEmail}`);
  console.log(`Main organization: ${mainOrgSubdomain}\n`);

  // Get demo1 organization
  const { data: mainOrg, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, subdomain')
    .eq('subdomain', mainOrgSubdomain)
    .single();

  if (orgError || !mainOrg) {
    console.error('Error finding main organization:', orgError);
    return;
  }

  console.log(`Found organization: ${mainOrg.name} (${mainOrg.subdomain})`);
  console.log(`Organization ID: ${mainOrg.id}\n`);

  // Update super admin's organization_id
  const { error: updateError } = await supabase
    .from('users')
    .update({
      organization_id: mainOrg.id,
      is_super_admin: true,
      is_tenant_admin: true,
      updated_at: new Date().toISOString()
    })
    .eq('email', superAdminEmail);

  if (updateError) {
    console.error('Error updating super admin:', updateError);
  } else {
    console.log(`✅ Successfully set ${superAdminEmail} to organization: ${mainOrg.name}`);
    console.log(`\nThis user will now:`);
    console.log(`- Appear in ${mainOrg.name}'s user list`);
    console.log(`- Still have access to ALL organizations via is_super_admin flag`);
  }
}

fixSuperAdmin().catch(console.error);
