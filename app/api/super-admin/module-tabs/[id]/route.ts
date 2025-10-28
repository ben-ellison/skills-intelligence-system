import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/module-tabs/[id]
// Get a specific module tab by ID
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

    const { data: tab, error } = await supabase
      .from('module_tabs')
      .select(`
        *,
        report:powerbi_reports(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !tab) {
      return NextResponse.json(
        { error: 'Module tab not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tab);
  } catch (error) {
    console.error('Error in GET module tab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/module-tabs/[id]
// Update a module tab
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
    const { module_name, tab_name, sort_order, report_id, page_name, is_active } = body;

    const supabase = createAdminClient();

    const updateData: any = {};
    if (module_name !== undefined) updateData.module_name = module_name;
    if (tab_name !== undefined) updateData.tab_name = tab_name;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (report_id !== undefined) updateData.report_id = report_id;
    if (page_name !== undefined) updateData.page_name = page_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: tab, error } = await supabase
      .from('module_tabs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        report:powerbi_reports(id, name)
      `)
      .single();

    if (error) {
      console.error('Error updating module tab:', error);
      return NextResponse.json(
        { error: 'Failed to update module tab', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(tab);
  } catch (error) {
    console.error('Error in PUT module tab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/module-tabs/[id]
// Delete a module tab
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
      .from('module_tabs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting module tab:', error);
      return NextResponse.json(
        { error: 'Failed to delete module tab' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE module tab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
