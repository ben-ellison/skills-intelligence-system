import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import ManageReportsWrapper from './page-wrapper';

export default async function ModuleTabConfigPage({
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
    .select('id, name, subdomain, powerbi_workspace_id, powerbi_workspace_name')
    .eq('id', organizationId)
    .single();

  if (orgError || !organization) {
    redirect('/super-admin');
  }

  // Fetch global modules with their tabs
  const { data: globalModules } = await supabase
    .from('global_modules')
    .select(`
      id,
      name,
      display_name,
      icon_name,
      sort_order,
      is_active
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Fetch global module tabs (template configuration)
  const { data: globalTabs } = await supabase
    .from('module_tabs')
    .select(`
      id,
      module_name,
      tab_name,
      sort_order,
      page_name,
      is_active,
      report_id,
      powerbi_reports:report_id (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Fetch organization's deployed reports
  const { data: deployedReports } = await supabase
    .from('organization_powerbi_reports')
    .select(`
      id,
      template_report_id,
      powerbi_report_id,
      deployment_status,
      deployed_at,
      deployed_by
    `)
    .eq('organization_id', organizationId)
    .eq('deployment_status', 'active');

  // Fetch organization's module instances
  const { data: orgModules } = await supabase
    .from('organization_modules')
    .select('*')
    .eq('organization_id', organizationId);

  // Fetch organization's tab overrides (both active and hidden)
  const { data: orgTabs } = await supabase
    .from('tenant_module_tabs')
    .select(`
      id,
      module_id,
      tab_name,
      sort_order,
      page_name,
      override_mode,
      hidden_global_tab_id,
      organization_report_id,
      is_active
    `)
    .eq('organization_id', organizationId);
    // We fetch ALL tabs (active and inactive) so the UI can identify hidden ones

  return (
    <ManageReportsWrapper
      organization={organization}
      templateReports={[]}
      deployedReports={deployedReports || []}
      globalModules={globalModules || []}
      globalTabs={globalTabs || []}
      orgModules={orgModules || []}
      orgTabs={orgTabs || []}
    />
  );
}
