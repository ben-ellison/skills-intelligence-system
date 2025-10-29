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

    // Verify user is tenant admin
    if (!session.user.isTenantAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { id: userId } = await params;

    // Get the current user's organization
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the target user belongs to the same organization
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.organization_id !== currentUser.organization_id) {
      return NextResponse.json({ error: 'Cannot edit users from other organizations' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, isTenantAdmin, roleIds } = body;

    // Update user details
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: name || null,
        is_tenant_admin: isTenantAdmin || false,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Update roles if provided
    if (roleIds !== undefined) {
      // Delete existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Insert new roles
      if (roleIds.length > 0) {
        const roleAssignments = roleIds.map((roleId: string) => ({
          user_id: userId,
          global_role_id: roleId,
        }));

        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(roleAssignments);

        if (rolesError) {
          console.error('Error updating roles:', rolesError);
          return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/tenant-admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
