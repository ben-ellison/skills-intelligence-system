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

    // Fetch user data
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, primary_role_id, organization_id')
      .eq('auth0_user_id', session.user.sub)
      .single();

    if (error || !userData) {
      console.error('Error fetching user data:', error);
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
