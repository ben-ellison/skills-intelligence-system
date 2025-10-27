import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient } from '@/lib/supabase/server';

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
    const {
      name,
      description,
      powerbiReportId,
      powerbiWorkspaceId,
      powerbiDatasetId,
      category,
      version,
      isActive,
    } = body;

    // Validate required fields
    if (!name || !powerbiReportId || !powerbiWorkspaceId) {
      return NextResponse.json(
        { error: 'Name, PowerBI Report ID, and Workspace ID are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create report
    const { data: newReport, error: createError } = await supabase
      .from('powerbi_reports')
      .insert({
        name,
        description: description || null,
        powerbi_report_id: powerbiReportId,
        powerbi_workspace_id: powerbiWorkspaceId,
        powerbi_dataset_id: powerbiDatasetId || null,
        category: category || 'general',
        version: version || '1.0',
        is_active: isActive ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating report:', createError);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { data: reports, error } = await supabase
      .from('powerbi_reports')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json(reports || []);
  } catch (error) {
    console.error('Error in GET /api/super-admin/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
