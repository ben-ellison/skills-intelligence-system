import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { sendUserInvitationEmail } from '@/lib/email';
import { getOrganizationId } from '@/lib/organization-context';

export async function POST(
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
    const awaitedParams = await params;
    const userId = awaitedParams.id;

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get the user to resend invite to
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, organization_id, status')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user belongs to same organization
    if (user.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Unauthorized - User not in your organization' }, { status: 403 });
    }

    // Verify user is still in invited status
    if (user.status !== 'invited') {
      return NextResponse.json({ error: 'User is not in invited status' }, { status: 400 });
    }

    // Update invited_at timestamp
    const { error: updateError } = await supabase
      .from('users')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating invited_at:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Get organization details for email
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', user.organization_id)
      .single();

    // Send invitation email
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://demo1.skills-intelligence-system.com'}/signin`;

    try {
      await sendUserInvitationEmail(
        user.email,
        user.name || user.email,
        organization?.name || 'Your Organization',
        session.user.name || session.user.email || 'A team member',
        loginUrl
      );

      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully',
        emailSent: true,
      });
    } catch (emailError: any) {
      console.error('[RESEND-INVITE] Email error:', emailError);

      return NextResponse.json({
        success: true,
        message: 'User updated but email failed',
        emailSent: false,
        emailError: emailError.message || String(emailError),
      });
    }
  } catch (error) {
    console.error('Error in POST /api/tenant-admin/users/[id]/resend-invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
