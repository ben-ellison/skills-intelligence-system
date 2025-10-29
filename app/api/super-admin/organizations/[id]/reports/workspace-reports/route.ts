import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// Helper function to get PowerBI access token
async function getPowerBIAccessToken() {
  const clientId = process.env.POWERBI_CLIENT_ID;
  const clientSecret = process.env.POWERBI_CLIENT_SECRET;
  const tenantId = process.env.POWERBI_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('PowerBI credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
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

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get Azure AD token: ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

// GET /api/super-admin/organizations/[id]/reports/workspace-reports
// Fetch all reports with their pages from the organization's PowerBI workspace
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

    // Get organization's workspace ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, powerbi_workspace_id')
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
    const accessToken = await getPowerBIAccessToken();

    // Fetch all reports from the workspace
    const reportsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${organization.powerbi_workspace_id}/reports`;
    const reportsResponse = await fetch(reportsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!reportsResponse.ok) {
      const error = await reportsResponse.text();
      console.error('Failed to fetch workspace reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports from PowerBI workspace', details: error },
        { status: 500 }
      );
    }

    const { value: workspaceReports } = await reportsResponse.json();

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
              id: report.id,
              name: report.name,
              pages: pages.map((page: any) => ({
                name: page.name,
                displayName: page.displayName || page.name,
              })),
            };
          } else {
            console.warn(`Could not fetch pages for report ${report.name}`);
            return {
              id: report.id,
              name: report.name,
              pages: [],
            };
          }
        } catch (err) {
          console.error(`Error fetching pages for report ${report.name}:`, err);
          return {
            id: report.id,
            name: report.name,
            pages: [],
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      reports: reportsWithPages,
    });
  } catch (error) {
    console.error('Error in GET /api/super-admin/organizations/[id]/reports/workspace-reports:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch workspace reports',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
