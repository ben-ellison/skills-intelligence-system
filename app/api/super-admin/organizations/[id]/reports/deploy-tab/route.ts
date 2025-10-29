import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/super-admin/organizations/[id]/reports/deploy-tab
// Deploy a single tab configuration
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
    const {
      moduleId,
      moduleName,
      tabName,
      reportId,
      pageName,
      templateReportId,
      sortOrder,
    } = body;

    if (!moduleName || !tabName || !reportId || !pageName) {
      return NextResponse.json(
        { error: 'Missing required fields: moduleName, tabName, reportId, pageName' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, powerbi_workspace_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Step 1: Ensure the report is deployed to organization_powerbi_reports
    const { data: existingReport } = await supabase
      .from('organization_powerbi_reports')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('powerbi_report_id', reportId)
      .single();

    let orgReportId = existingReport?.id;

    if (!orgReportId) {
      const { data: deployedReport, error: deployError } = await supabase
        .from('organization_powerbi_reports')
        .insert({
          organization_id: organizationId,
          template_report_id: templateReportId,
          powerbi_report_id: reportId,
          powerbi_workspace_id: organization.powerbi_workspace_id,
          deployment_status: 'active',
          deployed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (deployError) {
        console.error('Error deploying report:', deployError);
        throw new Error(`Failed to deploy report: ${deployError.message}`);
      }
      orgReportId = deployedReport.id;
    }

    // Step 2: Ensure organization_modules entry exists
    let orgModuleId = moduleId;

    if (!orgModuleId) {
      // Find the global module
      const { data: globalModule } = await supabase
        .from('global_modules')
        .select('id')
        .eq('name', moduleName)
        .single();

      // Check if organization module exists
      const { data: existingOrgModule } = await supabase
        .from('organization_modules')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', moduleName)
        .single();

      if (existingOrgModule) {
        orgModuleId = existingOrgModule.id;
      } else {
        // Create organization module
        const { data: newOrgModule, error: moduleError } = await supabase
          .from('organization_modules')
          .insert({
            organization_id: organizationId,
            name: moduleName,
            global_module_id: globalModule?.id,
            is_active: true,
          })
          .select('id')
          .single();

        if (moduleError) {
          console.error('Error creating organization module:', moduleError);
          throw new Error(`Failed to create module: ${moduleError.message}`);
        }
        orgModuleId = newOrgModule.id;
      }
    }

    // Step 3: Create tenant_module_tabs entry
    const { data: tenantTab, error: tabError } = await supabase
      .from('tenant_module_tabs')
      .insert({
        organization_id: organizationId,
        module_id: orgModuleId,
        tab_name: tabName,
        sort_order: sortOrder || 0,
        page_name: pageName,
        organization_report_id: orgReportId,
        override_mode: 'add',
        is_active: true,
      })
      .select()
      .single();

    if (tabError) {
      console.error('Error creating tenant tab:', tabError);
      throw new Error(`Failed to create tab configuration: ${tabError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Tab deployed successfully',
      data: {
        tenantTab,
        orgReportId,
        orgModuleId,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/super-admin/organizations/[id]/reports/deploy-tab:', error);
    return NextResponse.json(
      {
        error: 'Failed to deploy tab',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
