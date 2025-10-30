import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    console.log('Looking up user with auth0_user_id:', session.user.sub);

    // Fetch user data
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, primary_role_id, organization_id')
      .eq('auth0_user_id', session.user.sub)
      .single();

    if (error || !userData) {
      console.error('Error fetching user data. Auth0 ID:', session.user.sub, 'Error:', error);

      // Try to find by email as fallback for debugging
      const { data: userByEmail } = await supabase
        .from('users')
        .select('email, auth0_user_id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        console.error('User exists by email but auth0_user_id mismatch!');
        console.error('Session auth0_user_id:', session.user.sub);
        console.error('Database auth0_user_id:', userByEmail.auth0_user_id);
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role data separately if primary_role_id exists
    let roleData = null;
    if (userData.primary_role_id) {
      const { data: role, error: roleError } = await supabase
        .from('global_roles')
        .select('id, name, display_name')
        .eq('id', userData.primary_role_id)
        .single();

      if (!roleError && role) {
        roleData = role;
      }
    }

    return NextResponse.json({
      userId: userData.id,
      roleId: userData.primary_role_id,
      organizationId: userData.organization_id,
      role: roleData,
    });
  } catch (error) {
    console.error('Error in user-info API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
