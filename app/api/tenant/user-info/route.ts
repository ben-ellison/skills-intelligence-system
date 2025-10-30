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

    // Fetch user data including role
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, role_id, organization_id, global_roles(id, name, display_name)')
      .eq('auth0_user_id', session.user.sub)
      .single();

    if (error || !userData) {
      console.error('Error fetching user data:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: userData.id,
      roleId: userData.role_id,
      organizationId: userData.organization_id,
      role: userData.global_roles,
    });
  } catch (error) {
    console.error('Error in user-info API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
