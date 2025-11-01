import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get all users in the organization with their roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        is_tenant_admin,
        status,
        invited_at,
        activated_at,
        last_login_at,
        primary_role_id,
        user_roles!user_roles_user_id_fkey (
          global_role_id,
          global_roles (
            id,
            name,
            display_name
          )
        )
      `)
      .eq('organization_id', organizationId)
      .order('email', { ascending: true });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({
        error: 'Failed to fetch users',
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      }, { status: 500 });
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in GET /api/tenant-admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
