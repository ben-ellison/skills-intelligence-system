import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/super-admin/organizations/[id]/reports - Deploy template report
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
    const body = await request.json();
    const { templateReportId, powerbiReportId, powerbiWorkspaceId, displayName } = body;

    // Validate required fields
    if (!templateReportId || !powerbiReportId || !powerbiWorkspaceId) {
      return NextResponse.json(
        { error: 'Template Report ID, PowerBI Report ID, and Workspace ID are required' },
        { status: 400 }
      );
    }

    // Validate GUID format for powerbiReportId
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(powerbiReportId)) {
      return NextResponse.json(
        { error: 'PowerBI Report ID must be a valid GUID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if this template is already deployed to this organization
    const { data: existing } = await supabase
      .from('organization_powerbi_reports')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('template_report_id', templateReportId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This template report is already deployed to this organization' },
        { status: 400 }
      );
    }

    // Get template report details
    const { data: templateReport, error: templateError } = await supabase
      .from('powerbi_reports')
      .select('*')
      .eq('id', templateReportId)
      .single();

    if (templateError || !templateReport) {
      return NextResponse.json(
        { error: 'Template report not found' },
        { status: 404 }
      );
    }

    // Deploy the report
    const { data: deployedReport, error: deployError } = await supabase
      .from('organization_powerbi_reports')
      .insert({
        organization_id: organizationId,
        template_report_id: templateReportId,
        powerbi_report_id: powerbiReportId,
        powerbi_workspace_id: powerbiWorkspaceId,
        name: templateReport.name,
        display_name: displayName || templateReport.name,
        description: templateReport.description,
        deployment_status: 'active',
        deployed_at: new Date().toISOString(),
        deployed_by: session.user.email,
      })
      .select()
      .single();

    if (deployError) {
      console.error('Error deploying report:', deployError);

      if (deployError.code === '23505') {
        return NextResponse.json(
          { error: 'This PowerBI report ID is already deployed' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to deploy report' },
        { status: 500 }
      );
    }

    return NextResponse.json(deployedReport, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/organizations/[id]/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
