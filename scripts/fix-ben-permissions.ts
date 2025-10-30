/**
 * Fix ben.ellison@aivii.co.uk permissions
 * Should be: is_tenant_admin = true, is_super_admin = false
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBenPermissions() {
  console.log('Fixing permissions for ben.ellison@aivii.co.uk...\n');

  // First, check current state
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, email, is_super_admin, is_tenant_admin, organization_id, organizations(name, subdomain)')
    .eq('email', 'ben.ellison@aivii.co.uk')
    .single();

  if (fetchError) {
    console.error('Error fetching user:', fetchError);
    return;
  }

  if (!user) {
    console.error('User not found!');
    return;
  }

  console.log('Current state:');
  console.log('  Email:', user.email);
  console.log('  Organization:', (user.organizations as any)?.name);
  console.log('  Subdomain:', (user.organizations as any)?.subdomain);
  console.log('  is_super_admin:', user.is_super_admin);
  console.log('  is_tenant_admin:', user.is_tenant_admin);
  console.log('');

  // Update to correct permissions
  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_super_admin: false,
      is_tenant_admin: true
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating permissions:', updateError);
    return;
  }

  console.log('✅ Successfully updated permissions!');
  console.log('New state:');
  console.log('  is_super_admin: false');
  console.log('  is_tenant_admin: true');

  // Verify the change
  const { data: updatedUser } = await supabase
    .from('users')
    .select('is_super_admin, is_tenant_admin')
    .eq('id', user.id)
    .single();

  console.log('\nVerified in database:');
  console.log('  is_super_admin:', updatedUser?.is_super_admin);
  console.log('  is_tenant_admin:', updatedUser?.is_tenant_admin);
}

fixBenPermissions()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
