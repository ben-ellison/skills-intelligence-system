import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is super admin
    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { is_super_admin, is_tenant_admin } = body;

    const supabase = createAdminClient();

    // Update user permissions
    const updateData: any = {};
    if (is_super_admin !== undefined) {
      updateData.is_super_admin = is_super_admin;
    }
    if (is_tenant_admin !== undefined) {
      updateData.is_tenant_admin = is_tenant_admin;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user permissions:', updateError);
      return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/users/[id]/permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
