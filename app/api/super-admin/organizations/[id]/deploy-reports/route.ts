/**
 * API Routes for Bulk PowerBI Report Deployment
 *
 * Endpoints:
 * - GET: Find matching reports for organization
 * - POST: Deploy reports in bulk
 * - DELETE: Remove deployed reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  findMatchingReportsForOrganization,
  getDeploymentStats,
  isReportDeployed,
} from '@/lib/powerbi/code-matcher';

/**
 * GET /api/super-admin/organizations/[id]/deploy-reports
 *
 * Find all matching PowerBI reports for an organization
 * Returns reports sorted by match score
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: organizationId } = await params;

    // Check authentication and super admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify super admin access
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('auth0_user_id', user.id)
      .single();

    if (
      userError ||
      !userData ||
      (userData.roles as any)?.name !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get matching reports and deployment stats
    const [matchingReports, stats] = await Promise.all([
      findMatchingReportsForOrganization(organizationId),
      getDeploymentStats(organizationId),
    ]);

    // Check which reports are already deployed
    const reportsWithStatus = await Promise.all(
      matchingReports.map(async (report) => {
        const deployed = await isReportDeployed(organizationId, report.id);
        return {
          ...report,
          isDeployed: deployed,
        };
      })
    );

    return NextResponse.json({
      success: true,
      organizationId,
      stats,
      reports: reportsWithStatus,
    });
  } catch (error: any) {
    console.error('Error finding matching reports:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/organizations/[id]/deploy-reports
 *
 * Deploy reports to an organization
 *
 * Body:
 * - mode: 'auto' | 'manual' | 'bulk'
 * - reportIds: string[] (for auto mode - which matching reports to deploy)
 * - deployments: Array<{templateReportId, powerbiReportId, powerbiWorkspaceId, powerbiDatasetId?}> (for manual mode)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: organizationId } = await params;
    const body = await request.json();

    // Check authentication and super admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify super admin access
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role_id, roles(name)')
      .eq('auth0_user_id', user.id)
      .single();

    if (
      userError ||
      !userData ||
      (userData.roles as any)?.name !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get organization workspace info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('powerbi_workspace_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { mode = 'auto', reportIds = [], deployments = [] } = body;

    let deploymentsToCreate: any[] = [];

    if (mode === 'auto') {
      // Auto mode: Deploy matching reports
      if (!reportIds || reportIds.length === 0) {
        return NextResponse.json(
          { error: 'No report IDs provided' },
          { status: 400 }
        );
      }

      if (!org.powerbi_workspace_id) {
        return NextResponse.json(
          { error: 'Organization does not have a PowerBI workspace configured' },
          { status: 400 }
        );
      }

      // Create deployment records for each report
      // Note: In a real implementation, you would call PowerBI API here
      // to actually deploy the reports and get real report IDs
      deploymentsToCreate = reportIds.map((templateId: string) => ({
        organization_id: organizationId,
        template_report_id: templateId,
        powerbi_report_id: `PLACEHOLDER-${templateId}`, // Would come from PowerBI API
        powerbi_workspace_id: org.powerbi_workspace_id,
        deployment_status: 'pending',
        deployed_by: userData.id,
        deployment_notes: 'Auto-deployed via bulk deployment system',
      }));
    } else if (mode === 'manual' || mode === 'bulk') {
      // Manual/Bulk mode: User provides the actual PowerBI IDs
      if (!deployments || deployments.length === 0) {
        return NextResponse.json(
          { error: 'No deployments provided' },
          { status: 400 }
        );
      }

      deploymentsToCreate = deployments.map((dep: any) => ({
        organization_id: organizationId,
        template_report_id: dep.templateReportId,
        powerbi_report_id: dep.powerbiReportId,
        powerbi_workspace_id:
          dep.powerbiWorkspaceId || org.powerbi_workspace_id,
        powerbi_dataset_id: dep.powerbiDatasetId,
        deployment_status: 'active',
        deployed_by: userData.id,
        deployment_notes: dep.notes || 'Manually deployed',
      }));
    } else {
      return NextResponse.json(
        { error: 'Invalid deployment mode' },
        { status: 400 }
      );
    }

    // Insert deployment records
    const { data: deployed, error: deployError } = await supabase
      .from('organization_powerbi_reports')
      .insert(deploymentsToCreate)
      .select();

    if (deployError) {
      console.error('Deployment error:', deployError);
      return NextResponse.json(
        { error: `Failed to deploy reports: ${deployError.message}` },
        { status: 500 }
      );
    }

    // Log deployment
    const logEntries = deploymentsToCreate.map((dep) => ({
      organization_id: organizationId,
      template_report_id: dep.template_report_id,
      action: 'deploy',
      status: 'success',
      powerbi_report_id: dep.powerbi_report_id,
      powerbi_workspace_id: dep.powerbi_workspace_id,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by_user_id: userData.id,
      triggered_by: 'manual',
      deployment_method: mode === 'auto' ? 'api' : 'manual_upload',
    }));

    await supabase.from('powerbi_deployment_log').insert(logEntries);

    return NextResponse.json({
      success: true,
      deployed: deployed?.length || 0,
      deployments: deployed,
    });
  } catch (error: any) {
    console.error('Error deploying reports:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/organizations/[id]/deploy-reports
 *
 * Remove deployed reports
 *
 * Body:
 * - reportIds: string[] (organization_powerbi_reports IDs to remove)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: organizationId } = await params;
    const body = await request.json();

    // Check authentication and super admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify super admin access
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role_id, roles(name)')
      .eq('auth0_user_id', user.id)
      .single();

    if (
      userError ||
      !userData ||
      (userData.roles as any)?.name !== 'super_admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportIds = [] } = body;

    if (!reportIds || reportIds.length === 0) {
      return NextResponse.json(
        { error: 'No report IDs provided' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active = false
    const { error: deleteError } = await supabase
      .from('organization_powerbi_reports')
      .update({
        is_active: false,
        deployment_status: 'archived',
      })
      .in('id', reportIds)
      .eq('organization_id', organizationId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to remove reports: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Log removal
    const logEntries = reportIds.map((id: string) => ({
      organization_id: organizationId,
      organization_report_id: id,
      action: 'delete',
      status: 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by_user_id: userData.id,
      triggered_by: 'manual',
      deployment_method: 'manual_upload',
    }));

    await supabase.from('powerbi_deployment_log').insert(logEntries);

    return NextResponse.json({
      success: true,
      removed: reportIds.length,
    });
  } catch (error: any) {
    console.error('Error removing reports:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
