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

    // Get the current user's organization and admin flags
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, is_tenant_admin, can_create_any_user')
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
    const { name, isTenantAdmin, roleIds, canCreateUsers, canCreateAnyUser } = body;

    // Check permissions for assigning Tenant Admin
    if (isTenantAdmin && !currentUser.is_tenant_admin) {
      return NextResponse.json({
        error: 'Only Tenant Admins can create other Tenant Admins'
      }, { status: 403 });
    }

    // Validate role assignments based on user's permissions
    if (roleIds !== undefined && roleIds.length > 0) {
      // If not tenant admin, check each role assignment permission
      if (!currentUser.is_tenant_admin) {
        for (const roleId of roleIds) {
          const { data: canAssign, error: permError } = await supabase
            .rpc('can_user_assign_role', {
              p_user_id: currentUser.id,
              p_target_role_id: roleId
            });

          if (permError || !canAssign) {
            // Get role name for better error message
            const { data: role } = await supabase
              .from('global_roles')
              .select('display_name')
              .eq('id', roleId)
              .single();

            return NextResponse.json({
              error: `You do not have permission to assign the role: ${role?.display_name || 'Unknown'}`
            }, { status: 403 });
          }
        }
      }
    }

    // Update user details
    const updateData: any = {
      name: name || null,
      is_tenant_admin: isTenantAdmin || false,
    };

    // Add admin permission flags if provided
    if (canCreateUsers !== undefined) {
      updateData.can_create_users = canCreateUsers;
    }
    if (canCreateAnyUser !== undefined) {
      updateData.can_create_any_user = canCreateAnyUser;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
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
