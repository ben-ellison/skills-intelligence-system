import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/tenant/powerbi-data
// Export data from the user's Immediate Priorities PowerBI report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user with their priority report info
    const { data: user } = await supabase
      .from('users')
      .select(`
        id,
        email,
        organization_id,
        primary_role_id,
        global_roles:primary_role_id (
          id,
          name,
          display_name,
          priority_report_id,
          powerbi_reports:priority_report_id (
            id,
            name
          )
        )
      `)
      .eq('email', session.user.email)
      .single();

    if (!user?.primary_role_id || !user.global_roles) {
      return NextResponse.json({ error: 'No role assigned' }, { status: 404 });
    }

    const role = user.global_roles as any;

    if (!role.priority_report_id || !role.powerbi_reports) {
      return NextResponse.json(
        { error: 'No priority report configured for your role' },
        { status: 404 }
      );
    }

    const templateReport = role.powerbi_reports;

    // Get deployed report for user's organization
    const { data: deployedReport } = await supabase
      .from('organization_powerbi_reports')
      .select('powerbi_report_id, powerbi_workspace_id')
      .eq('organization_id', user.organization_id)
      .eq('template_report_id', templateReport.id)
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
    const pages = pagesData.value;

    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'No pages found in report' },
        { status: 404 }
      );
    }

    // Use Export to File API to get actual data
    // This exports the visual data from the first page
    const exportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/ExportTo`;

    const exportResponse = await fetch(exportUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'JSON',
        powerBIReportConfiguration: {
          pages: [
            {
              pageName: pages[0].name
            }
          ]
        }
      })
    });

    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.error('PowerBI export failed:', errorText);

      // Return page info as fallback
      return NextResponse.json({
        source: 'pages_metadata',
        reportName: templateReport.name,
        roleName: role.display_name,
        pages: pages.map((p: any) => ({ name: p.name, displayName: p.displayName })),
        note: 'Data export not available. Using page metadata only.',
        exportError: errorText
      });
    }

    const exportData = await exportResponse.json();
    const exportId = exportData.id;

    // Poll for export completion (wait up to 30 seconds)
    let exportFile = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/exports/${exportId}`;
      const statusResponse = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${access_token}` },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();

        if (statusData.status === 'Succeeded') {
          // Get the exported file
          const fileUrl = `${statusUrl}/file`;
          const fileResponse = await fetch(fileUrl, {
            headers: { 'Authorization': `Bearer ${access_token}` },
          });

          if (fileResponse.ok) {
            exportFile = await fileResponse.json();
            break;
          }
        } else if (statusData.status === 'Failed') {
          console.error('Export failed:', statusData);
          break;
        }
      }
    }

    if (exportFile) {
      return NextResponse.json({
        source: 'powerbi_export',
        reportName: templateReport.name,
        roleName: role.display_name,
        data: exportFile,
        timestamp: new Date().toISOString(),
      });
    }

    // If export didn't complete, return page info
    return NextResponse.json({
      source: 'pages_metadata',
      reportName: templateReport.name,
      roleName: role.display_name,
      pages: pages.map((p: any) => ({ name: p.name, displayName: p.displayName })),
      note: 'Export timeout. Using page metadata only.'
    });

  } catch (error: any) {
    console.error('Error in GET /api/tenant/powerbi-data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
