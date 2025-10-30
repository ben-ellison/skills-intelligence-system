import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Checking user roles...\n');

  // Get all users without roles
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, primary_role_id, auth0_user_id, organization_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    process.exit(1);
  }

  console.log('Recent users:');
  users?.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} - Primary Role ID: ${user.primary_role_id || 'NOT ASSIGNED'}`);
  });

  // Get all available roles
  const { data: roles, error: rolesError } = await supabase
    .from('global_roles')
    .select('id, name, display_name')
    .eq('is_active', true)
    .order('role_level', { ascending: true });

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    process.exit(1);
  }

  console.log('\nAvailable roles:');
  roles?.forEach((role, index) => {
    console.log(`${index + 1}. ${role.display_name} (${role.name}) - ID: ${role.id}`);
  });

  // Find users without roles
  const usersWithoutRoles = users?.filter(u => !u.primary_role_id) || [];

  if (usersWithoutRoles.length === 0) {
    console.log('\n✓ All users have roles assigned!');
    process.exit(0);
  }

  console.log(`\n⚠️  Found ${usersWithoutRoles.length} user(s) without roles`);
  console.log('\nTo assign a role, you need to add an entry to the user_roles table.');
  console.log('This will auto-trigger the primary_role_id to be set.\n');

  // Auto-assign Senior Leader role to first user without role (for testing)
  if (process.argv.includes('--auto-assign')) {
    const seniorLeaderRole = roles?.find(r => r.name === 'senior_leader');
    if (seniorLeaderRole && usersWithoutRoles[0]) {
      console.log(`🔄 Auto-assigning Senior Leader role to ${usersWithoutRoles[0].email}...`);

      // Insert into user_roles table - this will auto-set primary_role_id via trigger
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: usersWithoutRoles[0].id,
          organization_id: usersWithoutRoles[0].organization_id,
          global_role_id: seniorLeaderRole.id,
          granted_by: usersWithoutRoles[0].id, // Self-granted for testing
        });

      if (insertError) {
        console.error('Error assigning role:', insertError);
      } else {
        console.log('✓ Role assigned successfully!');
        console.log('  The primary_role_id should now be auto-set via trigger.');
      }
    }
  }
}

main();
