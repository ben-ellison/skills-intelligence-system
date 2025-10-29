import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const masterWorkspaceId = process.env.POWERBI_MASTER_WORKSPACE_ID;

    if (!masterWorkspaceId) {
      return NextResponse.json(
        { error: 'Master workspace ID not configured. Please set POWERBI_MASTER_WORKSPACE_ID environment variable.' },
        { status: 500 }
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

    // Fetch reports from master workspace
    const reportsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${masterWorkspaceId}/reports`;
    const reportsResponse = await fetch(reportsUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!reportsResponse.ok) {
      console.error('Failed to fetch reports from master workspace');
      return NextResponse.json(
        { error: 'Failed to fetch reports from PowerBI' },
        { status: 500 }
      );
    }

    const { value: reports } = await reportsResponse.json();

    // For each report, fetch its pages
    const reportsWithPages = await Promise.all(
      reports.map(async (report: any) => {
        const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${masterWorkspaceId}/reports/${report.id}/pages`;

        try {
          const pagesResponse = await fetch(pagesUrl, {
            headers: { Authorization: `Bearer ${access_token}` },
          });

          if (pagesResponse.ok) {
            const { value: pages } = await pagesResponse.json();
            return {
              id: report.id,
              name: report.name,
              datasetId: report.datasetId,
              pages: pages.map((page: any) => ({
                name: page.name,
                displayName: page.displayName || page.name,
                order: page.order,
              })),
            };
          } else {
            return {
              id: report.id,
              name: report.name,
              datasetId: report.datasetId,
              pages: [],
            };
          }
        } catch (err) {
          console.error(`Error fetching pages for report ${report.id}:`, err);
          return {
            id: report.id,
            name: report.name,
            datasetId: report.datasetId,
            pages: [],
          };
        }
      })
    );

    // Sort reports alphabetically
    const sortedReports = reportsWithPages.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      reports: sortedReports,
      workspaceId: masterWorkspaceId,
    });
  } catch (error) {
    console.error('Error in GET /api/super-admin/reports/scan-master-workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
