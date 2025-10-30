import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/tenant/powerbi-data
// Export data from PowerBI report based on AI prompt configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, email, organization_id, primary_role_id')
      .eq('email', session.user.email)
      .single();

    if (!user?.primary_role_id) {
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

    if (!aiPrompt || !aiPrompt.powerbi_report_id) {
      return NextResponse.json(
        { error: 'No PowerBI report configured for AI analysis' },
        { status: 404 }
      );
    }

    const templateReportId = aiPrompt.powerbi_report_id;
    const selectedPageNames = aiPrompt.powerbi_page_names || [];

    // Get deployed report for user's organization
    const { data: deployedReport } = await supabase
      .from('organization_powerbi_reports')
      .select('powerbi_report_id, powerbi_workspace_id')
      .eq('organization_id', user.organization_id)
      .eq('template_report_id', templateReportId)
      .eq('deployment_status', 'active')
      .single();

    if (!deployedReport) {
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
      console.error('Failed to get PowerBI token');
      return NextResponse.json(
        { error: 'Failed to authenticate with PowerBI' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

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

    if (!allPages || allPages.length === 0) {
      return NextResponse.json(
        { error: 'No pages found in report' },
        { status: 404 }
      );
    }

    // Filter pages based on AI prompt configuration
    const pagesToProcess = selectedPageNames.length > 0
      ? allPages.filter((p: any) => selectedPageNames.includes(p.name))
      : allPages; // If no pages selected, use all pages

    if (pagesToProcess.length === 0) {
      return NextResponse.json(
        { error: 'Selected pages not found in report' },
        { status: 404 }
      );
    }

    // Collect visual data from all selected pages
    const allVisualsData: any[] = [];

    for (const page of pagesToProcess) {
      const visualsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages/${page.name}/visuals`;

      try {
        const visualsResponse = await fetch(visualsUrl, {
          headers: { 'Authorization': `Bearer ${access_token}` },
        });

        if (!visualsResponse.ok) {
          console.error(`Failed to fetch visuals for page ${page.name}`);
          continue;
        }

        const visualsData = await visualsResponse.json();
        const visuals = visualsData.value || [];

        // Export data from all visuals on this page
        const visualDataPromises = visuals.map(async (visual: any) => {
          try {
            const exportDataUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages/${page.name}/visuals/${visual.name}/exportData`;

            const exportResponse = await fetch(exportDataUrl, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${access_token}` },
            });

            if (exportResponse.ok) {
              const data = await exportResponse.text(); // Returns CSV format
              return {
                pageName: page.name,
                pageDisplayName: page.displayName,
                visualName: visual.name,
                visualTitle: visual.title,
                data: data,
                type: visual.type
              };
            }
            return null;
          } catch (error) {
            console.error(`Failed to export visual ${visual.name} on page ${page.name}:`, error);
            return null;
          }
        });

        const pageVisualsData = (await Promise.all(visualDataPromises)).filter(v => v !== null);
        allVisualsData.push(...pageVisualsData);
      } catch (error) {
        console.error(`Error processing page ${page.name}:`, error);
      }
    }

    if (allVisualsData.length > 0) {
      return NextResponse.json({
        source: 'powerbi_visuals',
        reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
        selectedPages: pagesToProcess.map((p: any) => p.displayName || p.name),
        visuals: allVisualsData,
        timestamp: new Date().toISOString(),
      });
    }

    // If no visual data available, return page info
    return NextResponse.json({
      source: 'pages_metadata',
      reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
      pages: pagesToProcess.map((p: any) => ({ name: p.name, displayName: p.displayName })),
      note: 'Visual data export not available. Using page metadata only.'
    });

  } catch (error: any) {
    console.error('Error in GET /api/tenant/powerbi-data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
