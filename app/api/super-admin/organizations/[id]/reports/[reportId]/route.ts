import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient } from '@/lib/supabase/server';

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
