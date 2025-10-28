import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/global-modules/[id]
// Get a specific global module
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: module, error } = await supabase
      .from('global_modules')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !module) {
      return NextResponse.json(
        { error: 'Global module not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error in GET global module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/global-modules/[id]
// Update a global module
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, display_name, icon_name, module_group, sort_order, description, is_active } = body;

    const supabase = createAdminClient();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (icon_name !== undefined) updateData.icon_name = icon_name;
    if (module_group !== undefined) updateData.module_group = module_group;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: module, error } = await supabase
      .from('global_modules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating global module:', error);
      return NextResponse.json(
        { error: 'Failed to update global module', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error in PUT global module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/global-modules/[id]
// Delete a global module
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('global_modules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting global module:', error);
      return NextResponse.json(
        { error: 'Failed to delete global module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE global module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
