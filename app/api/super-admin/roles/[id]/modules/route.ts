import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/roles/[id]/modules - Get modules assigned to a role
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const roleId = params.id;

    const supabase = createAdminClient();

    // Get all modules assigned to this role
    const { data: permissions, error } = await supabase
      .from('global_role_module_permissions')
      .select('module_id')
      .eq('role_id', roleId);

    if (error) {
      console.error('Error fetching role module permissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return just the module IDs
    const moduleIds = permissions?.map(p => p.module_id) || [];
    return NextResponse.json({ moduleIds });

  } catch (error) {
    console.error('Error in GET /api/super-admin/roles/[id]/modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/roles/[id]/modules - Set modules for a role (replaces all existing)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const roleId = params.id;
    const body = await request.json();
    const { moduleIds } = body;

    if (!Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: 'moduleIds must be an array' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Delete all existing permissions for this role
    const { error: deleteError } = await supabase
      .from('global_role_module_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) {
      console.error('Error deleting old permissions:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new permissions
    if (moduleIds.length > 0) {
      const permissions = moduleIds.map(moduleId => ({
        role_id: roleId,
        module_id: moduleId
      }));

      const { error: insertError } = await supabase
        .from('global_role_module_permissions')
        .insert(permissions);

      if (insertError) {
        console.error('Error inserting new permissions:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Module permissions updated successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/super-admin/roles/[id]/modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
