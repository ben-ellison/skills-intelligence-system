import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// Helper function to get PowerBI access token
async function getPowerBIAccessToken() {
  const clientId = process.env.POWERBI_CLIENT_ID;
  const clientSecret = process.env.POWERBI_CLIENT_SECRET;
  const tenantId = process.env.POWERBI_TENANT_ID;

  console.log('[PowerBI Auth] Checking credentials...');
  console.log('[PowerBI Auth] Client ID present:', !!clientId);
  console.log('[PowerBI Auth] Client Secret present:', !!clientSecret);
  console.log('[PowerBI Auth] Tenant ID present:', !!tenantId);

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('PowerBI credentials not configured. Missing: ' +
      (!clientId ? 'POWERBI_CLIENT_ID ' : '') +
      (!clientSecret ? 'POWERBI_CLIENT_SECRET ' : '') +
      (!tenantId ? 'POWERBI_TENANT_ID' : ''));
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  console.log('[PowerBI Auth] Requesting token from:', tokenUrl);

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

  console.log('[PowerBI Auth] Token response status:', tokenResponse.status);

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('[PowerBI Auth] Failed to get token:', error);
    throw new Error(`Failed to get Azure AD token: ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  console.log('[PowerBI Auth] Successfully obtained access token');
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
    console.log('[Scan Workspace] Getting PowerBI access token...');
    const accessToken = await getPowerBIAccessToken();
    console.log('[Scan Workspace] Successfully obtained access token');

    // Fetch all reports from the organization's workspace
    const reportsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${organization.powerbi_workspace_id}/reports`;
    console.log('[Scan Workspace] Fetching reports from:', reportsUrl);
    console.log('[Scan Workspace] Workspace ID:', organization.powerbi_workspace_id);
    console.log('[Scan Workspace] Workspace Name:', organization.powerbi_workspace_name);

    const reportsResponse = await fetch(reportsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('[Scan Workspace] PowerBI API response status:', reportsResponse.status);

    if (!reportsResponse.ok) {
      const error = await reportsResponse.text();
      console.error('[Scan Workspace] PowerBI API Error Response:', error);
      console.error('[Scan Workspace] Response Status:', reportsResponse.status);
      console.error('[Scan Workspace] Response StatusText:', reportsResponse.statusText);
      return NextResponse.json(
        {
          error: 'Failed to fetch reports from PowerBI workspace',
          details: error,
          status: reportsResponse.status,
          statusText: reportsResponse.statusText,
          workspaceId: organization.powerbi_workspace_id,
          workspaceName: organization.powerbi_workspace_name
        },
        { status: 500 }
      );
    }

    const { value: workspaceReports } = await reportsResponse.json();

    console.log(`Found ${workspaceReports?.length || 0} reports in workspace:`,
      workspaceReports?.map((r: any) => r.name) || []);

    // Fetch pages for each report
    const reportsWithPages = await Promise.all(
      workspaceReports.map(async (report: any) => {
        try {
          const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${organization.powerbi_workspace_id}/reports/${report.id}/pages`;
          const pagesResponse = await fetch(pagesUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (pagesResponse.ok) {
            const { value: pages } = await pagesResponse.json();
            return {
              ...report,
              pages: pages || [],
            };
          } else {
            console.warn(`Could not fetch pages for report ${report.name}`);
            return { ...report, pages: [] };
          }
        } catch (err) {
          console.error(`Error fetching pages for report ${report.name}:`, err);
          return { ...report, pages: [] };
        }
      })
    );

    console.log('Reports with pages:', reportsWithPages.map((r: any) => ({
      name: r.name,
      pageCount: r.pages.length,
      pages: r.pages.map((p: any) => p.displayName || p.name),
    })));

    // Get global module tabs (these define what we're trying to match)
    const { data: globalTabs, error: globalTabsError } = await supabase
      .from('module_tabs')
      .select(`
        id,
        module_name,
        tab_name,
        sort_order,
        page_name,
        report_id,
        powerbi_reports:report_id (
          id,
          name,
          powerbi_report_id
        )
      `)
      .eq('is_active', true);

    if (globalTabsError) {
      console.error('Failed to fetch global tabs:', globalTabsError);
      return NextResponse.json(
        { error: 'Failed to fetch global module tabs configuration' },
        { status: 500 }
      );
    }

    console.log(`Found ${globalTabs?.length || 0} global module tabs to match against`);

    // Get already deployed reports and tabs
    const { data: existingDeployments } = await supabase
      .from('organization_powerbi_reports')
      .select('id, template_report_id, powerbi_report_id')
      .eq('organization_id', organizationId);

    const existingPowerBIIds = new Set(
      existingDeployments?.map(d => d.powerbi_report_id) || []
    );

    // Get existing organization modules
    const { data: existingOrgModules } = await supabase
      .from('organization_modules')
      .select('id, name, global_module_id')
      .eq('organization_id', organizationId);

    const orgModulesMap = new Map(
      existingOrgModules?.map(m => [m.name, m]) || []
    );

    // Match workspace reports+pages to global module tabs
    const matchedTabs = [];
    const unmatchedItems = [];
    const deployed = [];
    const alreadyDeployed = [];
    const failed = [];

    // Try to match each global tab to workspace reports+pages
    for (const globalTab of globalTabs || []) {
      const templateReport = globalTab.powerbi_reports;
      if (!templateReport) continue;

      // Find matching workspace report by name (case-insensitive)
      const workspaceReport = reportsWithPages.find((wr: any) =>
        wr.name.toLowerCase() === templateReport.name.toLowerCase()
      );

      if (!workspaceReport) {
        // Report not found in workspace
        continue;
      }

      // Find matching page by name (case-insensitive)
      const matchingPage = workspaceReport.pages.find((page: any) =>
        (page.displayName || page.name).toLowerCase() === (globalTab.page_name || globalTab.tab_name).toLowerCase()
      );

      if (!matchingPage) {
        // Page not found in report
        unmatchedItems.push({
          type: 'page_not_found',
          module: globalTab.module_name,
          tab: globalTab.tab_name,
          reportName: workspaceReport.name,
          expectedPage: globalTab.page_name || globalTab.tab_name,
          availablePages: workspaceReport.pages.map((p: any) => p.displayName || p.name),
        });
        continue;
      }

      // We have a match! Store it for deployment
      matchedTabs.push({
        globalTabId: globalTab.id,
        moduleName: globalTab.module_name,
        tabName: globalTab.tab_name,
        sortOrder: globalTab.sort_order,
        templateReportId: templateReport.id,
        workspaceReportId: workspaceReport.id,
        workspaceReportName: workspaceReport.name,
        pageName: matchingPage.name, // Use the PowerBI internal page name
        pageDisplayName: matchingPage.displayName || matchingPage.name,
      });
    }

    // Add unmatched reports (reports in workspace with no global tab match)
    for (const workspaceReport of reportsWithPages) {
      const isMatched = matchedTabs.some(m => m.workspaceReportId === workspaceReport.id);
      if (!isMatched) {
        unmatchedItems.push({
          type: 'report_not_mapped',
          reportId: workspaceReport.id,
          reportName: workspaceReport.name,
          pages: workspaceReport.pages.map((p: any) => ({
            name: p.name,
            displayName: p.displayName || p.name,
          })),
        });
      }
    }

    console.log(`Matching complete: ${matchedTabs.length} matched tabs, ${unmatchedItems.length} unmatched items`);

    // Now deploy the matched configurations
    for (const match of matchedTabs) {
      try {
        // Step 1: Ensure report is deployed
        let orgReportId = existingDeployments?.find(
          d => d.powerbi_report_id === match.workspaceReportId
        )?.id;

        if (!orgReportId) {
          const { data: deployedReport, error: deployError } = await supabase
            .from('organization_powerbi_reports')
            .insert({
              organization_id: organizationId,
              template_report_id: match.templateReportId,
              powerbi_report_id: match.workspaceReportId,
              powerbi_workspace_id: organization.powerbi_workspace_id,
              name: match.workspaceReportName,
              deployment_status: 'active',
              deployed_at: new Date().toISOString(),
              deployed_by: session.user.email,
            })
            .select('id')
            .single();

          if (deployError) throw deployError;
          orgReportId = deployedReport.id;
        }

        // Step 2: Ensure organization module exists
        let orgModuleId = orgModulesMap.get(match.moduleName)?.id;

        if (!orgModuleId) {
          // Get global module
          const { data: globalModule } = await supabase
            .from('global_modules')
            .select('id, display_name')
            .eq('name', match.moduleName)
            .single();

          if (globalModule) {
            const { data: newOrgModule, error: moduleError } = await supabase
              .from('organization_modules')
              .insert({
                organization_id: organizationId,
                global_module_id: globalModule.id,
                name: match.moduleName,
                display_name: globalModule.display_name,
                is_active: true,
              })
              .select('id')
              .single();

            if (moduleError) throw moduleError;
            orgModuleId = newOrgModule.id;
            orgModulesMap.set(match.moduleName, newOrgModule);
          }
        }

        if (!orgModuleId) {
          failed.push({
            ...match,
            error: `Could not find or create organization module: ${match.moduleName}`,
          });
          continue;
        }

        // Step 3: Mark as deployed (no need to create tenant_module_tabs)
        // Global tabs + organization_powerbi_reports are sufficient
        // Creating tenant tabs with override_mode='add' causes duplicates!
        const tabInfo = {
          module: match.moduleName,
          tab: match.tabName,
          report: match.workspaceReportName,
          page: match.pageDisplayName,
        };

        deployed.push(tabInfo);
      } catch (err: any) {
        console.error('Error deploying tab configuration:', match.tabName, err);
        failed.push({
          ...match,
          error: err.message || 'Unknown error occurred',
        });
      }
    }

    console.log(`Deployment complete: ${deployed.length} newly deployed, ${alreadyDeployed.length} already deployed, ${failed.length} failed`);

    // ========================================
    // IMMEDIATE PRIORITIES REPORTS DEPLOYMENT
    // ========================================
    // Auto-detect and deploy reports with "Immediate Priorities" in the name
    // These are role-specific reports shown on the Summary page

    const priorityDeployed = [];
    const priorityAlreadyDeployed = [];
    const priorityFailed = [];

    // Find all "Immediate Priorities" reports in the workspace
    const priorityReports = reportsWithPages.filter((report: any) =>
      report.name.toLowerCase().includes('immediate priorities')
    );

    console.log(`Found ${priorityReports.length} Immediate Priorities reports in workspace`);

    for (const workspaceReport of priorityReports) {
      try {
        // Find the template report in powerbi_reports by name
        const { data: templateReport } = await supabase
          .from('powerbi_reports')
          .select('id')
          .ilike('name', workspaceReport.name)
          .single();

        if (!templateReport) {
          priorityFailed.push({
            reportName: workspaceReport.name,
            error: 'Template report not found in PowerBI Reports Library',
          });
          continue;
        }

        // Check if already deployed
        const existing = existingDeployments?.find(
          d => d.powerbi_report_id === workspaceReport.id
        );

        if (existing) {
          priorityAlreadyDeployed.push({
            reportName: workspaceReport.name,
          });
          continue;
        }

        // Deploy the priority report
        const { error: deployError } = await supabase
          .from('organization_powerbi_reports')
          .insert({
            organization_id: organizationId,
            template_report_id: templateReport.id,
            powerbi_report_id: workspaceReport.id,
            powerbi_workspace_id: organization.powerbi_workspace_id,
            name: workspaceReport.name,
            deployment_status: 'active',
            deployed_at: new Date().toISOString(),
            deployed_by: session.user.email,
          });

        if (deployError) throw deployError;

        priorityDeployed.push({
          reportName: workspaceReport.name,
        });
      } catch (err: any) {
        console.error('Error deploying priority report:', workspaceReport.name, err);
        priorityFailed.push({
          reportName: workspaceReport.name,
          error: err.message || 'Unknown error',
        });
      }
    }

    console.log(`Priority reports: ${priorityDeployed.length} deployed, ${priorityAlreadyDeployed.length} already deployed, ${priorityFailed.length} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        totalWorkspaceReports: reportsWithPages.length,
        totalGlobalTabs: globalTabs?.length || 0,
        matched: matchedTabs.length,
        deployed: deployed.length,
        alreadyDeployed: alreadyDeployed.length,
        failed: failed.length,
        unmatched: unmatchedItems.length,
        priorityReportsDeployed: priorityDeployed.length,
        priorityReportsAlreadyDeployed: priorityAlreadyDeployed.length,
        priorityReportsFailed: priorityFailed.length,
      },
      deployed,
      alreadyDeployed,
      failed,
      unmatched: unmatchedItems,
      priorityDeployed,
      priorityAlreadyDeployed,
      priorityFailed,
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
