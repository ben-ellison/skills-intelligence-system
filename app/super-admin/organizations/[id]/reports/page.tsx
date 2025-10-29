import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import ManageReportsWrapper from './page-wrapper';

export default async function ManageReportsPage({
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
  const { data: organization, error: orgError} = await supabase
    .from('organizations')
    .select('id, name, subdomain, powerbi_workspace_id, powerbi_workspace_name')
    .eq('id', organizationId)
    .single();

  if (orgError || !organization) {
    redirect('/super-admin');
  }

  // Fetch all template reports (from master workspace)
  const { data: templateReports } = await supabase
    .from('powerbi_reports')
    .select('id, name, description, powerbi_report_id, powerbi_workspace_id, category, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  // Fetch already deployed reports for this organization
  const { data: deployedReports } = await supabase
    .from('organization_powerbi_reports')
    .select(`
      id,
      template_report_id,
      powerbi_report_id,
      powerbi_workspace_id,
      name,
      display_name,
      description,
      deployment_status,
      deployment_error,
      deployed_at,
      deployed_by,
      created_at
    `)
    .eq('organization_id', organizationId)
    .order('deployed_at', { ascending: false });

  return (
    <ManageReportsWrapper
      organization={organization}
      templateReports={templateReports || []}
      deployedReports={deployedReports || []}
    />
  );
}
