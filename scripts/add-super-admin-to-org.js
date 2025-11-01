// Script to add ben.ellison@edvanceiq.co.uk as super admin to an existing organization
// Usage: node scripts/add-super-admin-to-org.js <subdomain>

const { createClient } = require('@supabase/supabase-js');

const subdomain = process.argv[2];

if (!subdomain) {
  console.error('Usage: node scripts/add-super-admin-to-org.js <subdomain>');
  console.error('Example: node scripts/add-super-admin-to-org.js primarygoal');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const superAdminEmail = 'ben.ellison@edvanceiq.co.uk';

async function addSuperAdminToOrg() {
  try {
    // Get organization by subdomain
    console.log(`Looking up organization with subdomain: ${subdomain}`);
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('subdomain', subdomain)
      .single();

    if (orgError || !org) {
      console.error('Organization not found:', orgError);
      process.exit(1);
    }

    console.log(`Found organization: ${org.name} (${org.id})`);

    // Check if super admin user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id, is_super_admin, is_tenant_admin')
      .eq('email', superAdminEmail)
      .single();

    if (existingUser) {
      console.log(`User ${superAdminEmail} already exists`);

      // Update to add to this organization
      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: org.id,
          is_super_admin: true,
          is_tenant_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        process.exit(1);
      }

      console.log(`✅ Successfully added ${superAdminEmail} as super admin to ${org.name}`);
    } else {
      console.log(`Creating new user: ${superAdminEmail}`);

      // Create new super admin user
      const { error: createError } = await supabase
        .from('users')
        .insert({
          email: superAdminEmail,
          organization_id: org.id,
          is_super_admin: true,
          is_tenant_admin: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createError) {
        console.error('Error creating user:', createError);
        process.exit(1);
      }

      console.log(`✅ Successfully created ${superAdminEmail} as super admin for ${org.name}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSuperAdminToOrg();
