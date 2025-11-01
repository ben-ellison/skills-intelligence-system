import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { id: userId } = await params;

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Verify the target user belongs to the same organization
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Cannot edit users from other organizations' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'suspended', 'invited'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/tenant-admin/users/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
