import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
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

    const { id } = await params;
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

    // Update report
    const { data: updatedReport, error: updateError } = await supabase
      .from('powerbi_reports')
      .update({
        name,
        description: description || null,
        powerbi_report_id: powerbiReportId,
        powerbi_workspace_id: powerbiWorkspaceId,
        powerbi_dataset_id: powerbiDatasetId || null,
        category: category || 'general',
        version: version || '1.0',
        is_active: isActive ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating report:', updateError);
      return NextResponse.json(
        { error: 'Failed to update report', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/reports/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { id } = await params;
    const supabase = createAdminClient();

    // Delete report (or mark as inactive)
    const { error: deleteError } = await supabase
      .from('powerbi_reports')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting report:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/reports/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
