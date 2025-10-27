import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Sync Auth0 user to Supabase database
 * Called by Auth0 Post-Login Action
 */
export async function POST(request: NextRequest) {
  try {
    // Verify request is from Auth0
    const authHeader = request.headers.get('authorization');
    const syncSecret = process.env.AUTH0_SYNC_SECRET;

    if (!authHeader || !syncSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== syncSecret) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      auth0_user_id,
      email,
      full_name,
      organization_id,
      roles = [],
    } = body;

    if (!auth0_user_id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: auth0_user_id, email' },
        { status: 400 }
      );
    }

    // Get admin client (bypasses RLS)
    const supabase = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth0_user_id', auth0_user_id)
      .single();

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email,
          full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('auth0_user_id', auth0_user_id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User updated',
        user_id: existingUser.id,
      });
    }

    // Get organization ID from Supabase if organization_id provided
    let orgId = null;
    if (organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('auth0_organization_id', organization_id)
        .single();

      orgId = orgData?.id || null;
    }

    // Determine admin flags from roles
    const isSuperAdmin = roles.includes('Super Admin');
    const isTenantAdmin = roles.includes('Tenant Admin');

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        auth0_user_id,
        email,
        full_name,
        organization_id: orgId,
        is_super_admin: isSuperAdmin,
        is_tenant_admin: isTenantAdmin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Assign roles in user_roles table
    if (roles.length > 0 && orgId) {
      // Get global role IDs
      const { data: globalRoles } = await supabase
        .from('global_roles')
        .select('id, role_name')
        .in('role_name', roles);

      if (globalRoles) {
        const roleAssignments = globalRoles.map(role => ({
          user_id: newUser.id,
          organization_id: orgId,
          global_role_id: role.id,
        }));

        await supabase.from('user_roles').insert(roleAssignments);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created',
      user_id: newUser.id,
    });
  } catch (error) {
    console.error('Sync user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
