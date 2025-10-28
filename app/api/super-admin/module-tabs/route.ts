import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/module-tabs
// Get all global module tabs (optionally filter by module name)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get('moduleName');

    const supabase = createAdminClient();

    let query = supabase
      .from('module_tabs')
      .select(`
        *,
        report:powerbi_reports(id, name)
      `)
      .order('module_name', { ascending: true })
      .order('sort_order', { ascending: true });

    if (moduleName) {
      query = query.eq('module_name', moduleName);
    }

    const { data: tabs, error } = await query;

    if (error) {
      console.error('Error fetching module tabs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch module tabs' },
        { status: 500 }
      );
    }

    return NextResponse.json(tabs || []);
  } catch (error) {
    console.error('Error in GET module tabs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/module-tabs
// Create a new global module tab
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { module_name, tab_name, sort_order, report_id, page_name, is_active } = body;

    if (!module_name || !tab_name || !report_id) {
      return NextResponse.json(
        { error: 'module_name, tab_name, and report_id are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: tab, error } = await supabase
      .from('module_tabs')
      .insert({
        module_name,
        tab_name,
        sort_order: sort_order || 0,
        report_id,
        page_name: page_name || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        report:powerbi_reports(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating module tab:', error);
      return NextResponse.json(
        { error: 'Failed to create module tab', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(tab);
  } catch (error) {
    console.error('Error in POST module tab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
