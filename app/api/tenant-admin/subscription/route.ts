import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

export async function GET(request: NextRequest) {
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

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgIdError } = await getOrganizationId(request, session.user.email);

    if (orgIdError || !organizationId) {
      return NextResponse.json({ error: orgIdError || 'Organization not found' }, { status: 404 });
    }

    // Get organization with subscription details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        subscription_tiers (
          name,
          display_name,
          max_learners,
          price_per_learner
        )
      `)
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error in GET /api/tenant-admin/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
