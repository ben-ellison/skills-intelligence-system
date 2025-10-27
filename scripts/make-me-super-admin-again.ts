import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function restoreSuperAdmin() {
  try {
    console.log('🔄 Restoring super admin access...\n');

    // Find your user by email (update this to your actual email)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(10);

    if (userError || !users || users.length === 0) {
      console.error('❌ Could not find users');
      return;
    }

    console.log('Found users:');
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} (${u.full_name})`);
    });

    // Find ben.ellison@edvanceiq.co.uk (that's you!)
    const yourUser = users.find(u => u.email?.includes('ben.ellison@edvanceiq.co.uk')) || users[0];

    const { error: updateError } = await supabase
      .from('users')
      .update({
        organization_id: null,
        role_id: null,
        is_super_admin: true,
        is_tenant_admin: true,
      })
      .eq('id', yourUser.id);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }

    console.log('\n✅ Successfully restored super admin access!');
    console.log(`   Email: ${yourUser.email}`);
    console.log('   Super Admin: YES');
    console.log('\n🚀 Sign out and sign back in to access super-admin portal');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

restoreSuperAdmin();
