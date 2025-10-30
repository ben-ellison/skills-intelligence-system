import { createAdminClient } from '@/lib/supabase/server';

interface PowerBIVisualData {
  pageName: string;
  pageDisplayName: string;
  visualName: string;
  visualTitle: string;
  data: string;
  type: string;
}

export interface PowerBIDataResult {
  source: 'powerbi_visuals' | 'pages_metadata';
  reportName?: string;
  selectedPages?: string[];
  visuals?: PowerBIVisualData[];
  pages?: Array<{ name: string; displayName: string }>;
  note?: string;
  timestamp?: string;
  debug?: any;
}

export async function fetchPowerBIVisualData(
  userEmail: string,
  roleId: string
): Promise<PowerBIDataResult> {
  console.log('[PowerBI Fetch] Starting for user:', userEmail);

  const supabase = createAdminClient();

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('id, email, organization_id, primary_role_id')
    .eq('email', userEmail)
    .single();

  console.log('[PowerBI Fetch] User found:', {
    userId: user?.id,
    orgId: user?.organization_id,
    roleId: user?.primary_role_id
  });

  if (!user?.primary_role_id) {
    throw new Error('No role assigned');
  }

  // Get AI prompt configuration
  const { data: aiPrompt } = await supabase
    .from('ai_prompts')
    .select(`
      powerbi_report_id,
      powerbi_page_names,
      powerbi_reports:powerbi_report_id (
        id,
        name
      )
    `)
    .eq('role_id', user.primary_role_id)
    .eq('is_active', true)
    .eq('prompt_type', 'daily_summary')
    .maybeSingle();

  console.log('[PowerBI Fetch] AI Prompt config:', {
    hasPrompt: !!aiPrompt,
    reportId: aiPrompt?.powerbi_report_id,
    pageNames: aiPrompt?.powerbi_page_names,
    reportName: (aiPrompt?.powerbi_reports as any)?.name
  });

  if (!aiPrompt || !aiPrompt.powerbi_report_id) {
    throw new Error('No PowerBI report configured for AI analysis');
  }

  const templateReportId = aiPrompt.powerbi_report_id;
  const selectedPageNames = aiPrompt.powerbi_page_names || [];
  console.log('[PowerBI Fetch] Selected pages:', selectedPageNames);

  // Get deployed report for user's organization
  const { data: deployedReport } = await supabase
    .from('organization_powerbi_reports')
    .select('powerbi_report_id, powerbi_workspace_id')
    .eq('organization_id', user.organization_id)
    .eq('template_report_id', templateReportId)
    .eq('deployment_status', 'active')
    .single();

  console.log('[PowerBI Fetch] Deployed report:', {
    hasReport: !!deployedReport,
    reportId: deployedReport?.powerbi_report_id,
    workspaceId: deployedReport?.powerbi_workspace_id
  });

  if (!deployedReport) {
    throw new Error('Report not deployed to your organization');
  }

  // Get PowerBI access token
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.POWERBI_CLIENT_ID!,
        client_secret: process.env.POWERBI_CLIENT_SECRET!,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.text();
    console.error('[PowerBI Fetch] Failed to get PowerBI token:', tokenError);
    throw new Error('Failed to authenticate with PowerBI');
  }

  const { access_token } = await tokenResponse.json();
  console.log('[PowerBI Fetch] Got PowerBI access token');

  // Get report details to find dataset ID
  const reportDetailsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}`;
  const reportDetailsResponse = await fetch(reportDetailsUrl, {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });

  if (!reportDetailsResponse.ok) {
    const reportError = await reportDetailsResponse.text();
    console.error('[PowerBI Fetch] Failed to get report details:', reportError);
    throw new Error('Failed to get report details');
  }

  const reportDetails = await reportDetailsResponse.json();
  const datasetId = reportDetails.datasetId;
  const datasetWorkspaceId = reportDetails.datasetWorkspaceId || deployedReport.powerbi_workspace_id;

  console.log('[PowerBI Fetch] Report details:', {
    datasetId,
    datasetWorkspaceId
  });

  if (!datasetId) {
    throw new Error('No dataset ID found for report');
  }

  // Get report pages first
  const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages`;
  const pagesResponse = await fetch(pagesUrl, {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });

  if (!pagesResponse.ok) {
    const errorText = await pagesResponse.text();
    console.error('[PowerBI Fetch] PowerBI pages fetch failed:', errorText);
    throw new Error('Unable to fetch report pages');
  }

  const pagesData = await pagesResponse.json();
  const allPages = pagesData.value || [];

  console.log('[PowerBI Fetch] Pages fetched:', {
    totalPages: allPages.length,
    pageNames: allPages.map((p: any) => p.name)
  });

  if (!allPages || allPages.length === 0) {
    throw new Error('No pages found in report');
  }

  // Filter pages based on AI prompt configuration
  const pagesToProcess = selectedPageNames.length > 0
    ? allPages.filter((p: any) => selectedPageNames.includes(p.name))
    : allPages;

  console.log('[PowerBI Fetch] Pages to process:', {
    count: pagesToProcess.length,
    pages: pagesToProcess.map((p: any) => p.displayName || p.name)
  });

  if (pagesToProcess.length === 0) {
    throw new Error('Selected pages not found in report');
  }

  // Instead of exporting visuals (which doesn't work via REST API),
  // query the dataset directly using Execute Queries API
  console.log('[PowerBI Fetch] Querying dataset directly for data');

  const queryUrl = `https://api.powerbi.com/v1.0/myorg/groups/${datasetWorkspaceId}/datasets/${datasetId}/executeQueries`;

  // Use DMV query to get all measures in the dataset
  // This will show us what calculated metrics are available
  const queryBody = {
    queries: [
      {
        query: "EVALUATE INFO.MEASURES()"
      }
    ],
    serializerSettings: {
      includeNulls: true
    }
  };

  const queryResponse = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(queryBody)
  });

  if (!queryResponse.ok) {
    const queryError = await queryResponse.text();
    console.error('[PowerBI Fetch] Dataset query failed:', {
      status: queryResponse.status,
      error: queryError.substring(0, 1000)
    });
    // Fall back to metadata if query fails
    console.log('[PowerBI Fetch] Falling back to page metadata');
    return {
      source: 'pages_metadata',
      reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
      selectedPages: pagesToProcess.map((p: any) => p.displayName || p.name),
      pages: pagesToProcess.map((p: any) => ({ name: p.name, displayName: p.displayName })),
      note: 'Dataset query failed. Using page metadata only.',
      debug: {
        pagesAttempted: pagesToProcess.length,
        queryError: queryError.substring(0, 500)
      }
    };
  }

  const queryData = await queryResponse.json();
  console.log('[PowerBI Fetch] ✓ Dataset query successful, got results');

  // Return the dataset query results
  return {
    source: 'dataset_query',
    reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
    selectedPages: pagesToProcess.map((p: any) => p.displayName || p.name),
    datasetData: queryData,
    timestamp: new Date().toISOString(),
    debug: {
      datasetId,
      pagesProcessed: pagesToProcess.length
    }
  };

  // Old visual export code (doesn't work - keeping for reference)
  // Collect visual data from all selected pages
  const allVisualsData: PowerBIVisualData[] = [];

  for (const page of pagesToProcess) {
    console.log(`[PowerBI Fetch] Processing page: ${page.displayName || page.name}`);
    const visualsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages/${page.name}/visuals`;

    try {
      const visualsResponse = await fetch(visualsUrl, {
        headers: { 'Authorization': `Bearer ${access_token}` },
      });

      if (!visualsResponse.ok) {
        const visualsError = await visualsResponse.text();
        console.error(`[PowerBI Fetch] ✗ Failed to fetch visuals for page ${page.name}:`, {
          status: visualsResponse.status,
          statusText: visualsResponse.statusText,
          url: visualsUrl,
          error: visualsError.substring(0, 1000)
        });
        continue;
      }

      const visualsData = await visualsResponse.json();
      const visuals = visualsData.value || [];
      console.log(`[PowerBI Fetch] Found ${visuals.length} visuals on page ${page.displayName || page.name}`);

      // Try to export data from visuals using Export Visual Data endpoint
      const visualDataPromises = visuals.map(async (visual: any) => {
        try {
          // PowerBI REST API: Export Visual Data
          // Docs: https://learn.microsoft.com/en-us/rest/api/power-bi/reports/export-visual-data-in-group
          const exportDataUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages/${page.name}/visuals/${visual.name}/exportData`;

          console.log(`[PowerBI Fetch] Attempting to export visual: ${visual.title || visual.name} (type: ${visual.type})`);

          // Try POST first (documented way)
          let exportResponse = await fetch(exportDataUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              format: 'CSV'
            })
          });

          // If POST fails, try GET (some APIs use GET)
          if (!exportResponse.ok && exportResponse.status === 404) {
            console.log(`[PowerBI Fetch] POST failed with 404, trying GET for ${visual.name}`);
            exportResponse = await fetch(exportDataUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${access_token}`
              }
            });
          }

          if (exportResponse.ok) {
            const data = await exportResponse.text();
            console.log(`[PowerBI Fetch] ✓ Successfully exported visual "${visual.title}", data length: ${data.length} chars`);
            return {
              pageName: page.name,
              pageDisplayName: page.displayName,
              visualName: visual.name,
              visualTitle: visual.title,
              data: data,
              type: visual.type
            };
          } else {
            const exportError = await exportResponse.text();
            console.error(`[PowerBI Fetch] ✗ Failed to export visual "${visual.title}" (${visual.name}):`, {
              status: exportResponse.status,
              statusText: exportResponse.statusText,
              error: exportError.substring(0, 500)
            });
          }
          return null;
        } catch (error) {
          console.error(`[PowerBI Fetch] Exception exporting visual ${visual.name}:`, error);
          return null;
        }
      });

      const pageVisualsData = (await Promise.all(visualDataPromises)).filter(v => v !== null) as PowerBIVisualData[];
      console.log(`[PowerBI Fetch] Successfully exported ${pageVisualsData.length} visuals from page ${page.displayName || page.name}`);
      allVisualsData.push(...pageVisualsData);
    } catch (error) {
      console.error(`[PowerBI Fetch] Error processing page ${page.name}:`, error);
    }
  }

  if (allVisualsData.length > 0) {
    console.log(`[PowerBI Fetch] SUCCESS: Returning ${allVisualsData.length} visuals from ${pagesToProcess.length} pages`);
    return {
      source: 'powerbi_visuals',
      reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
      selectedPages: pagesToProcess.map((p: any) => p.displayName || p.name),
      visuals: allVisualsData,
      timestamp: new Date().toISOString(),
      debug: {
        pagesProcessed: pagesToProcess.length,
        visualsExported: allVisualsData.length
      }
    };
  }

  // If no visual data available, return page info
  console.log('[PowerBI Fetch] WARNING: No visual data available, returning metadata only');
  return {
    source: 'pages_metadata',
    reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
    selectedPages: pagesToProcess.map((p: any) => p.displayName || p.name),
    pages: pagesToProcess.map((p: any) => ({ name: p.name, displayName: p.displayName })),
    note: 'Visual data export not available. Using page metadata only.',
    debug: {
      pagesAttempted: pagesToProcess.length,
      visualsFound: 0,
      message: 'All visual export attempts failed - check Vercel logs for PowerBI API errors'
    }
  };
}
