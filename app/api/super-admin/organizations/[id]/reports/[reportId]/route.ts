import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// PATCH /api/super-admin/organizations/[id]/reports/[reportId] - Update deployed report
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId, reportId } = await params;
    const body = await request.json();
    const { deployment_status, display_name } = body;

    const supabase = createAdminClient();

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (deployment_status) {
      updates.deployment_status = deployment_status;
    }

    if (display_name !== undefined) {
      updates.display_name = display_name;
    }

    // Update the report
    const { data: updatedReport, error: updateError } = await supabase
      .from('organization_powerbi_reports')
      .update(updates)
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating report:', updateError);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/organizations/[id]/reports/[reportId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/organizations/[id]/reports/[reportId]
// Delete a report from an organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId, reportId } = await params;
    const supabase = createAdminClient();

    // Delete the report
    const { error: deleteError } = await supabase
      .from('organization_powerbi_reports')
      .delete()
      .eq('id', reportId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('Error deleting report:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/organizations/[id]/reports/[reportId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
