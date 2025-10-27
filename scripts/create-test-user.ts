import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTestUser() {
  try {
    console.log('📝 Creating test user for Demo Training Provider...\n');

    // Get Demo Training Provider organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Demo Training Provider')
      .single();

    if (orgError || !org) {
      console.error('❌ Could not find Demo Training Provider');
      return;
    }

    console.log(`✓ Found organization: ${org.name} (${org.id})`);

    // Get "Skills Coach" role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, display_name')
      .eq('name', 'Skills Coach')
      .single();

    if (roleError || !role) {
      console.error('❌ Could not find Skills Coach role');
      return;
    }

    console.log(`✓ Found role: ${role.display_name} (${role.id})`);

    // Check if test user already exists
    const testAuth0Id = 'auth0|test-skills-coach-user';
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('auth0_id', testAuth0Id)
      .single();

    if (existingUser) {
      console.log('\n⚠️  Test user already exists. Updating...');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: org.id,
          role_id: role.id,
          is_super_admin: false,
          is_tenant_admin: false,
        })
        .eq('auth0_id', testAuth0Id);

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return;
      }

      console.log('✅ Test user updated successfully!');
    } else {
      console.log('\nCreating new test user...');

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          auth0_id: testAuth0Id,
          email: 'testcoach@example.com',
          full_name: 'Test Skills Coach',
          organization_id: org.id,
          role_id: role.id,
          is_super_admin: false,
          is_tenant_admin: false,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }

      console.log('✅ Test user created successfully!');
    }

    console.log('\n📋 Test User Details:');
    console.log('   Email: testcoach@example.com');
    console.log('   Role: Skills Coach');
    console.log('   Organization: Demo Training Provider');
    console.log('   Auth0 ID:', testAuth0Id);

    console.log('\n🔐 To log in as this user:');
    console.log('   You would need to create this user in Auth0 with the same auth0_id');
    console.log('   Or you can update YOUR current user to have this role temporarily:');
    console.log('   (See next script for that option)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestUser();
