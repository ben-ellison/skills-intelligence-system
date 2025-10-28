import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import OrganizationProfileWrapper from './page-wrapper';

export default async function OrganizationProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Check if user is a Super Admin
  if (!session.user?.isSuperAdmin) {
    redirect('/dashboard');
  }

  const { id: organizationId } = await params;
  const supabase = createAdminClient();

  // Fetch organization details
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (orgError || !organization) {
    redirect('/super-admin');
  }

  // Fetch subscription details
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      pricing_tiers (
        id,
        name,
        display_name,
        tier_level,
        price_per_learner,
        included_learners,
        overage_price
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch users in this organization
  const { data: users } = await supabase
    .from('users')
    .select('id, email, is_tenant_admin, created_at, last_login')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  // Fetch deployed reports
  const { data: deployedReports } = await supabase
    .from('organization_powerbi_reports')
    .select(`
      id,
      powerbi_report_id,
      powerbi_workspace_id,
      name,
      display_name,
      deployment_status,
      deployed_at,
      template_report:powerbi_reports (
        id,
        name,
        display_name
      )
    `)
    .eq('organization_id', organizationId)
    .order('deployed_at', { ascending: false });

  // Fetch AI summaries count and token usage
  const { data: aiStats } = await supabase
    .from('ai_summaries')
    .select('id, tokens_used, generated_at')
    .eq('organization_id', organizationId);

  const totalSummaries = aiStats?.length || 0;
  const totalTokens = aiStats?.reduce((sum, s) => sum + (s.tokens_used || 0), 0) || 0;
  const last30DaysSummaries = aiStats?.filter(
    s => new Date(s.generated_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length || 0;

  return (
    <OrganizationProfileWrapper
      organization={organization}
      subscription={subscription}
      users={users || []}
      deployedReports={deployedReports || []}
      aiStats={{
        totalSummaries,
        totalTokens,
        last30DaysSummaries,
      }}
    />
  );
}
