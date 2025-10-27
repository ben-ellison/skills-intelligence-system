import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function makeMeSeniorLeader() {
  try {
    console.log('🔄 Temporarily changing your role to Senior Leader...\n');

    // Get all users to find yours
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError || !allUsers || allUsers.length === 0) {
      console.error('❌ Could not find any users');
      return;
    }

    // Find ben.ellison@edvanceiq.co.uk (that's you!)
    const currentUser = allUsers.find(u => u.email?.includes('ben.ellison@edvanceiq.co.uk')) || allUsers[0];

    if (!currentUser) {
      console.error('❌ Could not find your user');
      return;
    }

    console.log(`✓ Found your user: ${currentUser.email}`);

    // Get Demo Training Provider
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Demo Training Provider')
      .single();

    if (orgError || !org) {
      console.error('❌ Could not find Demo Training Provider');
      return;
    }

    console.log(`✓ Found organization: ${org.name}`);

    // Get "Senior Leader" role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, display_name')
      .eq('name', 'Senior Leader')
      .single();

    if (roleError || !role) {
      console.error('❌ Could not find Senior Leader role');
      return;
    }

    console.log(`✓ Found role: ${role.display_name}`);

    // Update your user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        organization_id: org.id,
        role_id: role.id,
        is_super_admin: false,
        is_tenant_admin: false,
      })
      .eq('id', currentUser.id);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }

    console.log('\n✅ Successfully changed your role!');
    console.log('\n📋 Your new profile:');
    console.log(`   Email: ${currentUser.email}`);
    console.log('   Role: Senior Leader');
    console.log('   Organization: Demo Training Provider');
    console.log('   Super Admin: NO');

    console.log('\n🚀 Next steps:');
    console.log('   1. Sign out and sign back in');
    console.log('   2. You will be redirected to /modules (tenant portal)');
    console.log('   3. You will see modules in the navigation bar');
    console.log('   4. Click on a module to see reports configured for Senior Leader role');

    console.log('\n⚠️  To restore super admin access, run:');
    console.log('   npx tsx scripts/make-me-super-admin-again.ts');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

makeMeSeniorLeader();
