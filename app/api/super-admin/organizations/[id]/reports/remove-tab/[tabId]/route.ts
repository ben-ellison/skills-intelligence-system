import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// DELETE /api/super-admin/organizations/[id]/reports/remove-tab/[tabId]
// Remove a deployed tab configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tabId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId, tabId } = await params;
    const supabase = createAdminClient();

    // Verify the tab belongs to this organization
    const { data: tab, error: tabError } = await supabase
      .from('tenant_module_tabs')
      .select('id, organization_id')
      .eq('id', tabId)
      .eq('organization_id', organizationId)
      .single();

    if (tabError || !tab) {
      return NextResponse.json(
        { error: 'Tab not found or does not belong to this organization' },
        { status: 404 }
      );
    }

    // Delete the tab
    const { error: deleteError } = await supabase
      .from('tenant_module_tabs')
      .delete()
      .eq('id', tabId);

    if (deleteError) {
      console.error('Error deleting tab:', deleteError);
      throw new Error(`Failed to delete tab: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Tab removed successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/organizations/[id]/reports/remove-tab/[tabId]:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove tab',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
