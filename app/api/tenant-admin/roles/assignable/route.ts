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

    const supabase = createAdminClient();

    // Get the current user's ID
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, is_tenant_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If Tenant Admin, return all active roles
    if (currentUser.is_tenant_admin) {
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
