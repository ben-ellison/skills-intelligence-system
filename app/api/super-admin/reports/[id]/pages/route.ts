import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: reportId } = await context.params;
    const supabase = createAdminClient();

    // Get report details to get PowerBI IDs
    const { data: report, error: reportError } = await supabase
      .from('powerbi_reports')
      .select('powerbi_report_id, powerbi_workspace_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
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

    // Fetch pages for this report
    const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${report.powerbi_workspace_id}/reports/${report.powerbi_report_id}/pages`;
    const pagesResponse = await fetch(pagesUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!pagesResponse.ok) {
      console.error('Failed to fetch pages from PowerBI');
      return NextResponse.json(
        { error: 'Failed to fetch pages from PowerBI' },
        { status: 500 }
      );
    }

    const { value: pages } = await pagesResponse.json();

    // Sort pages alphabetically by displayName
    const sortedPages = pages
      .map((page: any) => ({
        name: page.name,
        displayName: page.displayName || page.name,
        order: page.order,
      }))
      .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({ pages: sortedPages });
  } catch (error) {
    console.error('Error in GET /api/super-admin/reports/[id]/pages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
