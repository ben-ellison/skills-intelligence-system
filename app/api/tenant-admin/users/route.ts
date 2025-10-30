import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin
    if (!session.user.isTenantAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get the user's organization
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all users in the organization - ultra-simplified for debugging
    console.log('[DEBUG] Current user:', currentUser);
    console.log('[DEBUG] Fetching users for organization:', currentUser.organization_id);

    // First, try to just count users to test basic table access
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    console.log('[DEBUG] Total users count:', count, 'error:', countError);

    // Now try to get users for this organization
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, is_tenant_admin, status, invited_at, activated_at, last_login_at')
      .eq('organization_id', currentUser.organization_id);

    if (usersError) {
      console.error('[ERROR] Error fetching users:', JSON.stringify(usersError, null, 2));
      return NextResponse.json({
        error: 'Failed to fetch users',
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      }, { status: 500 });
    }

    console.log('[DEBUG] Successfully fetched', users?.length || 0, 'users');

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in GET /api/tenant-admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
