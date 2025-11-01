import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

// GET /api/tenant/priority-report
// Get the user's role-based Immediate Priorities report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // Get user with their primary role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        primary_role_id,
        global_roles:primary_role_id (
          id,
          name,
          display_name,
          priority_report_id,
          powerbi_reports:priority_report_id (
            id,
            name,
            powerbi_report_id,
            powerbi_workspace_id
          )
        )
      `)
      .eq('email', session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a primary role assigned
    if (!user.primary_role_id || !user.global_roles) {
      return NextResponse.json({
        hasRole: false,
        message: 'No primary role assigned. Please contact your administrator.',
      });
    }

    const role = user.global_roles as any;

    // Check if role has a priority report configured
    if (!role.priority_report_id || !role.powerbi_reports) {
      return NextResponse.json({
        hasRole: true,
        roleName: role.display_name,
        hasPriorityReport: false,
        message: `No Immediate Priorities report configured for ${role.display_name} role.`,
      });
    }

    const templateReport = role.powerbi_reports;

    // Find the deployed instance of this report for the organization (based on subdomain)
    const { data: deployedReport, error: deployedError } = await supabase
      .from('organization_powerbi_reports')
      .select('id, powerbi_report_id, powerbi_workspace_id, name, deployment_status')
      .eq('organization_id', organizationId)
      .eq('template_report_id', templateReport.id)
      .eq('deployment_status', 'active')
      .single();

    if (deployedError || !deployedReport) {
      return NextResponse.json({
        hasRole: true,
        roleName: role.display_name,
        hasPriorityReport: true,
        isDeployed: false,
        message: `${role.display_name} Immediate Priorities report is not deployed to your organization yet.`,
      });
    }

    // Return the deployed report details
    return NextResponse.json({
      hasRole: true,
      roleName: role.display_name,
      hasPriorityReport: true,
      isDeployed: true,
      report: {
        id: deployedReport.id,
        name: deployedReport.name,
        reportId: deployedReport.powerbi_report_id,
        workspaceId: deployedReport.powerbi_workspace_id,
        templateReportId: templateReport.id,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/tenant/priority-report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
