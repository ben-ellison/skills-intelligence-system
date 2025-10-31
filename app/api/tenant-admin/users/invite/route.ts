import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { sendUserInvitationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
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

    // Get the user's organization and admin flags
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, is_tenant_admin, can_create_any_user')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { email, name, isTenantAdmin, roleIds, canCreateUsers, canCreateAnyUser } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check permissions for assigning Tenant Admin
    if (isTenantAdmin && !currentUser.is_tenant_admin) {
      return NextResponse.json({
        error: 'Only Tenant Admins can create other Tenant Admins'
      }, { status: 403 });
    }

    // Validate role assignments based on user's permissions
    if (roleIds && roleIds.length > 0) {
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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Create the user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name: name || null,
        organization_id: currentUser.organization_id,
        is_tenant_admin: isTenantAdmin || false,
        can_create_users: canCreateUsers || false,
        can_create_any_user: canCreateAnyUser || false,
        status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Assign roles if provided
    if (roleIds && roleIds.length > 0) {
      const roleAssignments = roleIds.map((roleId: string) => ({
        user_id: newUser.id,
        global_role_id: roleId,
      }));

      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(roleAssignments);

      if (rolesError) {
        console.error('Error assigning roles:', rolesError);
        // Don't fail the entire request, user is created but without roles
      }
    }

    // Get organization details for email
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', currentUser.organization_id)
      .single();

    // Send invitation email
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://demo1.skills-intelligence-system.com'}/signin`;
    const emailSent = await sendUserInvitationEmail(
      email,
      name || email,
      organization?.name || 'Your Organization',
      session.user.name || session.user.email || 'A team member',
      loginUrl
    );

    if (!emailSent) {
      console.warn(`[INVITE] Email notification failed for ${email}, but user was created successfully`);
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User invited successfully',
      emailSent,
    });
  } catch (error) {
    console.error('Error in POST /api/tenant-admin/users/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
