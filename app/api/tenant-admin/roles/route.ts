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

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get all global roles
    const { data: roles, error: rolesError } = await supabase
      .from('global_roles')
      .select('id, name, display_name, description')
      .order('display_name');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error in GET /api/tenant-admin/roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
