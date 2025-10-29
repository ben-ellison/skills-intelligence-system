import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/super-admin/database-schemas/[id]/mappings - Create field mapping
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: schemaId } = await params;
    const body = await request.json();
    const {
      standardFieldName,
      standardFieldLabel,
      tableName,
      mappedFieldName,
      fieldType,
      isRequired,
      description,
      usedForFiltering,
      usedForAi,
    } = body;

    // Validation
    if (!standardFieldName || !standardFieldLabel || !mappedFieldName) {
      return NextResponse.json(
        { error: 'Standard Field Name, Label, and Mapped Field Name are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create mapping
    const { data: mapping, error } = await supabase
      .from('schema_field_mappings')
      .insert({
        schema_id: schemaId,
        standard_field_name: standardFieldName,
        standard_field_label: standardFieldLabel,
        table_name: tableName || null,
        mapped_field_name: mappedFieldName,
        field_type: fieldType || 'text',
        is_required: isRequired || false,
        description: description || null,
        used_for_filtering: usedForFiltering !== undefined ? usedForFiltering : true,
        used_for_ai: usedForAi || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating field mapping:', error);

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A mapping for this standard field already exists in this schema' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create field mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/database-schemas/[id]/mappings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/super-admin/database-schemas/[id]/mappings - List mappings for schema
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: schemaId } = await params;
    const supabase = createAdminClient();

    const { data: mappings, error } = await supabase
      .from('schema_field_mappings')
      .select('*')
      .eq('schema_id', schemaId)
      .order('standard_field_label', { ascending: true });

    if (error) {
      console.error('Error fetching field mappings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch field mappings' },
        { status: 500 }
      );
    }

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error in GET /api/super-admin/database-schemas/[id]/mappings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
