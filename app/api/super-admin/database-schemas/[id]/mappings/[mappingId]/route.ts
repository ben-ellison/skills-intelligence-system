import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// PATCH /api/super-admin/database-schemas/[id]/mappings/[mappingId] - Update mapping
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { mappingId } = await params;
    const body = await request.json();
    const {
      standardFieldName,
      standardFieldLabel,
      mappedFieldName,
      fieldType,
      isRequired,
      description,
      usedForFiltering,
      usedForAi,
    } = body;

    const supabase = createAdminClient();

    // Update mapping
    const { data: mapping, error } = await supabase
      .from('schema_field_mappings')
      .update({
        standard_field_name: standardFieldName,
        standard_field_label: standardFieldLabel,
        mapped_field_name: mappedFieldName,
        field_type: fieldType,
        is_required: isRequired,
        description: description || null,
        used_for_filtering: usedForFiltering,
        used_for_ai: usedForAi,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mappingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating field mapping:', error);
      return NextResponse.json(
        { error: 'Failed to update field mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/database-schemas/[id]/mappings/[mappingId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/database-schemas/[id]/mappings/[mappingId] - Delete mapping
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { mappingId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('schema_field_mappings')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Error deleting field mapping:', error);
      return NextResponse.json(
        { error: 'Failed to delete field mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/database-schemas/[id]/mappings/[mappingId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
