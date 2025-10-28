/**
 * Script to set up Ben Ellison users:
 * 1. Set ben.ellison@edvanceiq.co.uk as superuser (platform super admin)
 * 2. Create ben.ellison@aivii.co.uk as tenant admin for Demo Training Provider
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBenUsers() {
  console.log('🔧 Setting up Ben Ellison users...\n');

  try {
    // ============================================
    // 1. Set ben.ellison@edvanceiq.co.uk as superuser
    // ============================================
    console.log('1️⃣  Checking ben.ellison@edvanceiq.co.uk...');

    const edvanceEmail = 'ben.ellison@edvanceiq.co.uk';

    const { data: edvanceUser, error: edvanceCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', edvanceEmail)
      .single();

    if (edvanceCheckError && edvanceCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking edvanceiq user:', edvanceCheckError);
    } else if (edvanceUser) {
      // User exists, update to superuser
      console.log('   ✓ User exists, updating to superuser...');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_super_admin: true,
          is_tenant_admin: false,
          organization_id: null, // Superusers don't belong to an organization
          role_id: null, // Superusers don't have a role
          updated_at: new Date().toISOString(),
        })
        .eq('email', edvanceEmail);

      if (updateError) {
        console.error('   ❌ Error updating user:', updateError);
      } else {
        console.log('   ✅ Updated ben.ellison@edvanceiq.co.uk as superuser');
      }
    } else {
      // User doesn't exist, create as superuser
      console.log('   User does not exist, creating as superuser...');

      const { error: createError } = await supabase
        .from('users')
        .insert({
          email: edvanceEmail,
          is_super_admin: true,
          is_tenant_admin: false,
          organization_id: null,
          role_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        console.error('   ❌ Error creating user:', createError);
      } else {
        console.log('   ✅ Created ben.ellison@edvanceiq.co.uk as superuser');
      }
    }

    // ============================================
    // 2. Create ben.ellison@aivii.co.uk as tenant admin
    // ============================================
    console.log('\n2️⃣  Checking ben.ellison@aivii.co.uk...');

    const aiviiEmail = 'ben.ellison@aivii.co.uk';

    // First, get the Demo Training Provider organization
    const { data: demoOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('name', '%Demo%Training%')
      .single();

    if (orgError || !demoOrg) {
      console.error('   ❌ Error: Could not find Demo Training Provider organization');
      console.log('   Looking for any organization with "Demo" in the name...');

      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(10);

      console.log('   Available organizations:', allOrgs?.map(o => o.name).join(', '));
      return;
    }

    console.log(`   ✓ Found organization: ${demoOrg.name} (${demoOrg.id})`);

    // Check if aivii user exists
    const { data: aiviiUser, error: aiviiCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', aiviiEmail)
      .single();

    if (aiviiCheckError && aiviiCheckError.code !== 'PGRST116') {
      console.error('   ❌ Error checking aivii user:', aiviiCheckError);
    } else if (aiviiUser) {
      // User exists, update to tenant admin for Demo Training Provider
      console.log('   ✓ User exists, updating to tenant admin...');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_super_admin: false,
          is_tenant_admin: true,
          organization_id: demoOrg.id,
          role_id: null, // Tenant admins don't need a role
          updated_at: new Date().toISOString(),
        })
        .eq('email', aiviiEmail);

      if (updateError) {
        console.error('   ❌ Error updating user:', updateError);
      } else {
        console.log(`   ✅ Updated ben.ellison@aivii.co.uk as tenant admin for ${demoOrg.name}`);
      }
    } else {
      // User doesn't exist, create as tenant admin
      console.log('   User does not exist, creating as tenant admin...');

      const { error: createError } = await supabase
        .from('users')
        .insert({
          email: aiviiEmail,
          is_super_admin: false,
          is_tenant_admin: true,
          organization_id: demoOrg.id,
          role_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        console.error('   ❌ Error creating user:', createError);
      } else {
        console.log(`   ✅ Created ben.ellison@aivii.co.uk as tenant admin for ${demoOrg.name}`);
      }
    }

    console.log('\n✅ Setup complete!');
    console.log('\nSummary:');
    console.log('- ben.ellison@edvanceiq.co.uk → Platform Superuser (Super Admin)');
    console.log(`- ben.ellison@aivii.co.uk → Tenant Admin for ${demoOrg.name}`);

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupBenUsers();
