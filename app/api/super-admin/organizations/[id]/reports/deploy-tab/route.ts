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
    // Check by powerbi_report_id first
    let { data: existingReport } = await supabase
      .from('organization_powerbi_reports')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('powerbi_report_id', reportId)
      .maybeSingle();

    // If not found by powerbi_report_id, check by template_report_id
    if (!existingReport && templateReportId) {
      const { data: existingByTemplate } = await supabase
        .from('organization_powerbi_reports')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('template_report_id', templateReportId)
        .maybeSingle();

      existingReport = existingByTemplate;
    }

    let orgReportId = existingReport?.id;

    if (!orgReportId) {
      // Get the template report name to use for the deployed report
      let reportName = 'Deployed Report'; // Default fallback
      if (templateReportId) {
        const { data: templateReport } = await supabase
          .from('powerbi_reports')
          .select('name')
          .eq('id', templateReportId)
          .maybeSingle();

        if (templateReport?.name) {
          reportName = templateReport.name;
        }
      }

      console.log('[deploy-tab] Creating organization report with name:', reportName);

      const { data: deployedReport, error: deployError } = await supabase
        .from('organization_powerbi_reports')
        .insert({
          organization_id: organizationId,
          template_report_id: templateReportId,
          powerbi_report_id: reportId,
          powerbi_workspace_id: organization.powerbi_workspace_id,
          name: reportName,
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
      console.log('[deploy-tab] Finding global module for:', moduleName);

      // Find the global module
      const { data: globalModule, error: globalModuleError } = await supabase
        .from('global_modules')
        .select('id')
        .eq('name', moduleName)
        .maybeSingle();

      if (globalModuleError) {
        console.error('Error finding global module:', globalModuleError);
      }
      console.log('[deploy-tab] Global module:', globalModule);

      // Check if organization module exists
      const { data: existingOrgModule, error: orgModuleError } = await supabase
        .from('organization_modules')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', moduleName)
        .maybeSingle();

      if (orgModuleError) {
        console.error('Error finding organization module:', orgModuleError);
      }
      console.log('[deploy-tab] Existing org module:', existingOrgModule);

      if (existingOrgModule) {
        orgModuleId = existingOrgModule.id;
      } else {
        // Create organization module
        console.log('[deploy-tab] Creating new organization module');
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
        console.log('[deploy-tab] New org module created:', newOrgModule);
        orgModuleId = newOrgModule.id;
      }
    }

    console.log('[deploy-tab] Final orgModuleId:', orgModuleId);

    // Step 3: Check if this tab exists as a global tab
    const { data: globalTab } = await supabase
      .from('module_tabs')
      .select('id')
      .eq('module_name', moduleName)
      .eq('tab_name', tabName)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[deploy-tab] Global tab check:', globalTab ? 'EXISTS' : 'NOT FOUND');

    let tenantTab = null;

    if (globalTab) {
      // This tab exists as a global tab, so DON'T create tenant_module_tabs
      // The global tab + organization_powerbi_reports mapping is sufficient
      console.log('[deploy-tab] Tab exists globally - skipping tenant_module_tabs creation');

      // Delete any existing tenant_module_tabs entries that might be duplicates
      const { error: deleteError } = await supabase
        .from('tenant_module_tabs')
        .delete()
        .eq('organization_id', organizationId)
        .eq('module_id', orgModuleId)
        .eq('tab_name', tabName)
        .eq('override_mode', 'add'); // Only delete 'add' mode, keep 'hide' mode

      if (deleteError) {
        console.warn('[deploy-tab] Error deleting duplicate tenant tabs:', deleteError);
      }
    } else {
      // This is a custom tab that doesn't exist globally
      // Create or update tenant_module_tabs entry
      console.log('[deploy-tab] Custom tab - creating tenant_module_tabs entry');

      const { data: existingTab } = await supabase
        .from('tenant_module_tabs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('module_id', orgModuleId)
        .eq('tab_name', tabName)
        .maybeSingle();

      if (existingTab) {
        // Update existing custom tab
        const { data: updatedTab, error: updateError } = await supabase
          .from('tenant_module_tabs')
          .update({
            sort_order: sortOrder || 0,
            page_name: pageName,
            organization_report_id: orgReportId,
            override_mode: 'add',
            is_active: true,
            hidden_global_tab_id: null,
          })
          .eq('id', existingTab.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating tenant tab:', updateError);
          throw new Error(`Failed to update tab configuration: ${updateError.message}`);
        }
        tenantTab = updatedTab;
      } else {
        // Create new custom tenant tab
        const { data: newTab, error: tabError } = await supabase
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
        tenantTab = newTab;
      }
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
