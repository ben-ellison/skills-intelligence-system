import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/super-admin/database-schemas - Create new schema
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, displayName, description, providerType } = body;

    // Validation
    if (!name || !displayName) {
      return NextResponse.json(
        { error: 'Name and Display Name are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create schema
    const { data: schema, error } = await supabase
      .from('database_schemas')
      .insert({
        name,
        display_name: displayName,
        description: description || null,
        provider_type: providerType || null,
        created_by: session.user.email,
        updated_by: session.user.email,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating schema:', error);

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A schema with this name already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create schema' },
        { status: 500 }
      );
    }

    return NextResponse.json(schema, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/database-schemas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/super-admin/database-schemas - List all schemas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    const { data: schemas, error } = await supabase
      .from('database_schemas')
      .select('*')
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching schemas:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schemas' },
        { status: 500 }
      );
    }

    return NextResponse.json(schemas);
  } catch (error) {
    console.error('Error in GET /api/super-admin/database-schemas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
