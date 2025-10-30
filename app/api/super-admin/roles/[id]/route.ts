import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { name, display_name, description, icon, sort_order, is_active, parent_role_id, role_category, role_level } = body;

    const supabase = createAdminClient();

    // If name is being changed, check for duplicates
    if (name) {
      const { data: existing } = await supabase
        .from('global_roles')
        .select('id')
        .eq('name', name)
        .neq('id', params.id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'A role with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (parent_role_id !== undefined) updateData.parent_role_id = parent_role_id;
    if (role_category !== undefined) updateData.role_category = role_category;
    if (role_level !== undefined) updateData.role_level = role_level;

    const { data: updatedRole, error } = await supabase
      .from('global_roles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    if (!updatedRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/roles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const supabase = createAdminClient();

    // Check if any users are assigned this role
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('global_role_id', params.id)
      .limit(1);

    if (userRolesError) {
      console.error('Error checking user roles:', userRolesError);
      return NextResponse.json(
        { error: 'Failed to check role usage' },
        { status: 500 }
      );
    }

    if (userRoles && userRoles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to users' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('global_roles')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting role:', error);
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/roles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
