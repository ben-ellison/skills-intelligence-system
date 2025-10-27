import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/organizations/[id]/reports
// List all reports for an organization
export async function GET(
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

    const { data: reports, error } = await supabase
      .from('organization_powerbi_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json(reports || []);
  } catch (error) {
    console.error('Error in GET /api/super-admin/organizations/[id]/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/organizations/[id]/reports
// Add a new report to an organization
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
    const { powerbiReportId, powerbiReportName, powerbiWorkspaceId } = body;

    // Validate required fields
    if (!powerbiReportId || !powerbiReportName) {
      return NextResponse.json(
        { error: 'Report ID and Name are required' },
        { status: 400 }
      );
    }

    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(powerbiReportId)) {
      return NextResponse.json(
        { error: 'Report ID must be a valid GUID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if report already exists for this organization
    const { data: existing } = await supabase
      .from('organization_powerbi_reports')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('powerbi_report_id', powerbiReportId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This report is already added to this organization' },
        { status: 400 }
      );
    }

    // Get organization's workspace ID
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('powerbi_workspace_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org?.powerbi_workspace_id) {
      return NextResponse.json(
        { error: 'Organization does not have a PowerBI workspace configured' },
        { status: 400 }
      );
    }

    // First, create or get a template report for this
    // Since we're doing manual entry, we'll create a simple template on-the-fly
    const { data: templateReport, error: templateError } = await supabase
      .from('powerbi_reports')
      .insert({
        name: powerbiReportName,
        category: 'Manual Entry',
        powerbi_report_id: powerbiReportId,
        powerbi_workspace_id: org.powerbi_workspace_id,
        is_template: false, // Mark as not a template since it's organization-specific
        is_active: true,
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template report:', templateError);
      return NextResponse.json(
        { error: 'Failed to create template report' },
        { status: 500 }
      );
    }

    // Insert the organization report linking to the template
    const { data: newReport, error: insertError } = await supabase
      .from('organization_powerbi_reports')
      .insert({
        organization_id: organizationId,
        template_report_id: templateReport.id,
        powerbi_report_id: powerbiReportId,
        powerbi_workspace_id: org.powerbi_workspace_id,
        custom_display_name: powerbiReportName,
        deployment_status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting report:', insertError);
      return NextResponse.json(
        { error: 'Failed to add report' },
        { status: 500 }
      );
    }

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/organizations/[id]/reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
