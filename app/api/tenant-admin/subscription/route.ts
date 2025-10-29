import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin
    if (!session.user.isTenantAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get the user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      .eq('id', user.organization_id)
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
