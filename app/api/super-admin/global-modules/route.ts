import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/global-modules
// Get all global modules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: modules, error } = await supabase
      .from('global_modules')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching global modules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch global modules' },
        { status: 500 }
      );
    }

    return NextResponse.json(modules || []);
  } catch (error) {
    console.error('Error in GET global modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/global-modules
// Create a new global module
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, display_name, icon_name, module_group, sort_order, description, is_active } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'name and display_name are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: module, error } = await supabase
      .from('global_modules')
      .insert({
        name,
        display_name,
        icon_name: icon_name || null,
        module_group: module_group || null,
        sort_order: sort_order || 0,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating global module:', error);
      return NextResponse.json(
        { error: 'Failed to create global module', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(module);
  } catch (error) {
    console.error('Error in POST global module:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/super-admin/global-modules
// Update multiple modules (for reordering)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { modules } = body; // Array of {id, sort_order}

    if (!Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'modules array is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Update sort orders for all modules
    const updates = modules.map(async ({ id, sort_order }) => {
      return supabase
        .from('global_modules')
        .update({ sort_order })
        .eq('id', id);
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH global modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
