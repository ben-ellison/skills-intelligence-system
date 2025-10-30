import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/tenant/powerbi-data
// Export data from PowerBI report based on AI prompt configuration
export async function GET(request: NextRequest) {
  try {
    console.log('[PowerBI Data] Starting request');
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      console.log('[PowerBI Data] No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PowerBI Data] User email:', session.user.email);
    const supabase = createAdminClient();

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, email, organization_id, primary_role_id')
      .eq('email', session.user.email)
      .single();

    console.log('[PowerBI Data] User found:', {
      userId: user?.id,
      orgId: user?.organization_id,
      roleId: user?.primary_role_id
    });

    if (!user?.primary_role_id) {
      console.log('[PowerBI Data] No role assigned');
      return NextResponse.json({ error: 'No role assigned' }, { status: 404 });
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

    console.log('[PowerBI Data] AI Prompt config:', {
      hasPrompt: !!aiPrompt,
      reportId: aiPrompt?.powerbi_report_id,
      pageNames: aiPrompt?.powerbi_page_names,
      reportName: (aiPrompt?.powerbi_reports as any)?.name
    });

    if (!aiPrompt || !aiPrompt.powerbi_report_id) {
      console.log('[PowerBI Data] No PowerBI report configured');
      return NextResponse.json(
        { error: 'No PowerBI report configured for AI analysis' },
        { status: 404 }
      );
    }

    const templateReportId = aiPrompt.powerbi_report_id;
    const selectedPageNames = aiPrompt.powerbi_page_names || [];
    console.log('[PowerBI Data] Selected pages:', selectedPageNames);

    // Get deployed report for user's organization
    const { data: deployedReport } = await supabase
      .from('organization_powerbi_reports')
      .select('powerbi_report_id, powerbi_workspace_id')
      .eq('organization_id', user.organization_id)
      .eq('template_report_id', templateReportId)
      .eq('deployment_status', 'active')
      .single();

    console.log('[PowerBI Data] Deployed report:', {
      hasReport: !!deployedReport,
      reportId: deployedReport?.powerbi_report_id,
      workspaceId: deployedReport?.powerbi_workspace_id
    });

    if (!deployedReport) {
      console.log('[PowerBI Data] Report not deployed to organization');
      return NextResponse.json(
        { error: 'Report not deployed to your organization' },
        { status: 404 }
      );
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
      console.error('[PowerBI Data] Failed to get PowerBI token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to authenticate with PowerBI' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();
    console.log('[PowerBI Data] Got PowerBI access token');

    // Get report pages first
    const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages`;
    const pagesResponse = await fetch(pagesUrl, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error('PowerBI pages fetch failed:', errorText);
      return NextResponse.json(
        { error: 'Unable to fetch report pages', details: errorText },
        { status: 500 }
      );
    }

    const pagesData = await pagesResponse.json();
    const allPages = pagesData.value || [];

    console.log('[PowerBI Data] Pages fetched:', {
      totalPages: allPages.length,
      pageNames: allPages.map((p: any) => p.name)
    });

    if (!allPages || allPages.length === 0) {
      console.log('[PowerBI Data] No pages found in report');
      return NextResponse.json(
        { error: 'No pages found in report' },
        { status: 404 }
      );
    }

    // Filter pages based on AI prompt configuration
    const pagesToProcess = selectedPageNames.length > 0
      ? allPages.filter((p: any) => selectedPageNames.includes(p.name))
      : allPages; // If no pages selected, use all pages

    console.log('[PowerBI Data] Pages to process:', {
      count: pagesToProcess.length,
      pages: pagesToProcess.map((p: any) => p.displayName || p.name)
    });

    if (pagesToProcess.length === 0) {
      console.log('[PowerBI Data] Selected pages not found in report');
      return NextResponse.json(
        { error: 'Selected pages not found in report' },
        { status: 404 }
      );
    }

    // Collect visual data from all selected pages
    const allVisualsData: any[] = [];

    for (const page of pagesToProcess) {
      console.log(`[PowerBI Data] Processing page: ${page.displayName || page.name}`);
      const visualsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages/${page.name}/visuals`;

      try {
        const visualsResponse = await fetch(visualsUrl, {
          headers: { 'Authorization': `Bearer ${access_token}` },
        });

        if (!visualsResponse.ok) {
          const visualsError = await visualsResponse.text();
          console.error(`[PowerBI Data] Failed to fetch visuals for page ${page.name}:`, visualsError);
          continue;
        }

        const visualsData = await visualsResponse.json();
        const visuals = visualsData.value || [];
        console.log(`[PowerBI Data] Found ${visuals.length} visuals on page ${page.displayName || page.name}`);

        // Export data from all visuals on this page
        const visualDataPromises = visuals.map(async (visual: any) => {
          try {
            const exportDataUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages/${page.name}/visuals/${visual.name}/exportData`;

            console.log(`[PowerBI Data] Exporting visual: ${visual.title || visual.name}`);
            const exportResponse = await fetch(exportDataUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                format: 'CSV'
              })
            });

            if (exportResponse.ok) {
              const data = await exportResponse.text(); // Returns CSV format
              console.log(`[PowerBI Data] Successfully exported visual ${visual.title}, data length: ${data.length} chars`);
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
              console.error(`[PowerBI Data] Failed to export visual ${visual.name}:`, exportResponse.status, exportError);
            }
            return null;
          } catch (error) {
            console.error(`[PowerBI Data] Failed to export visual ${visual.name} on page ${page.name}:`, error);
            return null;
          }
        });

        const pageVisualsData = (await Promise.all(visualDataPromises)).filter(v => v !== null);
        console.log(`[PowerBI Data] Successfully exported ${pageVisualsData.length} visuals from page ${page.displayName || page.name}`);
        allVisualsData.push(...pageVisualsData);
      } catch (error) {
        console.error(`[PowerBI Data] Error processing page ${page.name}:`, error);
      }
    }

    if (allVisualsData.length > 0) {
      console.log(`[PowerBI Data] SUCCESS: Returning ${allVisualsData.length} visuals from ${pagesToProcess.length} pages`);
      return NextResponse.json({
        source: 'powerbi_visuals',
        reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
        selectedPages: pagesToProcess.map((p: any) => p.displayName || p.name),
        visuals: allVisualsData,
        timestamp: new Date().toISOString(),
        debug: {
          pagesProcessed: pagesToProcess.length,
          visualsExported: allVisualsData.length
        }
      });
    }

    // If no visual data available, return page info WITH DEBUG INFO
    console.log('[PowerBI Data] WARNING: No visual data available, returning metadata only');
    return NextResponse.json({
      source: 'pages_metadata',
      reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
      pages: pagesToProcess.map((p: any) => ({ name: p.name, displayName: p.displayName })),
      note: 'Visual data export not available. Using page metadata only.',
      debug: {
        pagesAttempted: pagesToProcess.length,
        visualsFound: pagesToProcess.reduce((sum: number, p: any) => sum + (p._visualCount || 0), 0),
        message: 'All visual export attempts failed - check Vercel logs for PowerBI API errors'
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/tenant/powerbi-data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
