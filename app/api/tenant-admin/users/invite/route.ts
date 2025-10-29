import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

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

    // Get the user's organization
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { email, name, isTenantAdmin, roleIds } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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

    // TODO: Send invitation email

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User invited successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/tenant-admin/users/invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
