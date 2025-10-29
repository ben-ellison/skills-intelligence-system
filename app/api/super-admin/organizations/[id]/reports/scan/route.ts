import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// Helper function to get PowerBI access token
async function getPowerBIAccessToken() {
  const clientId = process.env.POWERBI_CLIENT_ID;
  const clientSecret = process.env.POWERBI_CLIENT_SECRET;
  const tenantId = process.env.POWERBI_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('PowerBI credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const tokenParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get Azure AD token: ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

// POST /api/super-admin/organizations/[id]/reports/scan
// Scan organization's PowerBI workspace and auto-match reports
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;
    const supabase = createAdminClient();

    // Get organization's workspace ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, powerbi_workspace_id, powerbi_workspace_name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!organization.powerbi_workspace_id) {
      return NextResponse.json(
        { error: 'Organization does not have a PowerBI workspace configured' },
        { status: 400 }
      );
    }

    // Get PowerBI access token
    const accessToken = await getPowerBIAccessToken();

    // Fetch all reports from the organization's workspace
    const reportsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${organization.powerbi_workspace_id}/reports`;
    const reportsResponse = await fetch(reportsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!reportsResponse.ok) {
      const error = await reportsResponse.text();
      console.error('Failed to fetch workspace reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports from PowerBI workspace', details: error },
        { status: 500 }
      );
    }

    const { value: workspaceReports } = await reportsResponse.json();

    // Get all template reports
    const { data: templateReports, error: templateError } = await supabase
      .from('powerbi_reports')
      .select('id, name, powerbi_report_id, description')
      .eq('is_active', true);

    if (templateError) {
      console.error('Failed to fetch template reports:', templateError);
      return NextResponse.json(
        { error: 'Failed to fetch template reports' },
        { status: 500 }
      );
    }

    // Get already deployed reports for this organization
    const { data: existingDeployments } = await supabase
      .from('organization_powerbi_reports')
      .select('template_report_id, powerbi_report_id')
      .eq('organization_id', organizationId);

    const existingTemplateIds = new Set(
      existingDeployments?.map(d => d.template_report_id) || []
    );
    const existingPowerBIIds = new Set(
      existingDeployments?.map(d => d.powerbi_report_id) || []
    );

    // Match workspace reports to templates by name
    const matches = [];
    const unmatched = [];

    for (const workspaceReport of workspaceReports) {
      // Skip if this PowerBI report is already deployed
      if (existingPowerBIIds.has(workspaceReport.id)) {
        continue;
      }

      // Try to match by name (case-insensitive)
      const matchedTemplate = templateReports?.find(
        (template) =>
          template.name.toLowerCase() === workspaceReport.name.toLowerCase() &&
          !existingTemplateIds.has(template.id)
      );

      if (matchedTemplate) {
        matches.push({
          templateReportId: matchedTemplate.id,
          templateName: matchedTemplate.name,
          powerbiReportId: workspaceReport.id,
          powerbiReportName: workspaceReport.name,
          workspaceId: organization.powerbi_workspace_id,
        });
      } else {
        unmatched.push({
          powerbiReportId: workspaceReport.id,
          powerbiReportName: workspaceReport.name,
        });
      }
    }

    // Auto-deploy matched reports
    const deployed = [];
    const failed = [];

    for (const match of matches) {
      try {
        const { data: deployedReport, error: deployError } = await supabase
          .from('organization_powerbi_reports')
          .insert({
            organization_id: organizationId,
            template_report_id: match.templateReportId,
            powerbi_report_id: match.powerbiReportId,
            powerbi_workspace_id: match.workspaceId,
            name: match.templateName,
            display_name: match.templateName,
            deployment_status: 'active',
            deployed_at: new Date().toISOString(),
            deployed_by: session.user.email,
          })
          .select()
          .single();

        if (deployError) {
          console.error('Failed to deploy report:', match.templateName, deployError);
          failed.push({
            ...match,
            error: deployError.message,
          });
        } else {
          deployed.push(deployedReport);
        }
      } catch (err: any) {
        console.error('Error deploying report:', match.templateName, err);
        failed.push({
          ...match,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalWorkspaceReports: workspaceReports.length,
        matched: matches.length,
        deployed: deployed.length,
        failed: failed.length,
        unmatched: unmatched.length,
      },
      deployed,
      failed,
      unmatched,
      organizationName: organization.name,
      workspaceName: organization.powerbi_workspace_name,
    });
  } catch (error) {
    console.error('Error in POST /api/super-admin/organizations/[id]/reports/scan:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan workspace',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
