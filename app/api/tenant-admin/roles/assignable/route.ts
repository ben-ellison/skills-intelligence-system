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

    const supabase = createAdminClient();

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get the current user's ID from the correct organization
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, is_tenant_admin')
      .eq('email', session.user.email)
      .eq('organization_id', organizationId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If Tenant Admin or Super Admin, return all active roles
    if (currentUser.is_tenant_admin || session.user.isSuperAdmin) {
      const { data: roles, error: rolesError } = await supabase
        .from('global_roles')
        .select('id, name, display_name, description, role_category, role_level')
        .eq('is_active', true)
        .order('role_level', { ascending: true })
        .order('sort_order', { ascending: true });

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
      }

      return NextResponse.json(roles || []);
    }

    // For non-tenant admins, use the database function to get assignable roles
    const { data: assignableRoles, error: assignableError } = await supabase
      .rpc('get_assignable_roles_for_user', {
        p_user_id: currentUser.id
      });

    if (assignableError) {
      console.error('Error fetching assignable roles:', assignableError);
      return NextResponse.json({ error: 'Failed to fetch assignable roles' }, { status: 500 });
    }

    return NextResponse.json(assignableRoles || []);
  } catch (error) {
    console.error('Error in GET /api/tenant-admin/roles/assignable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
