import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = params;

    const supabase = createAdminClient();

    // Get the report details
    const { data: report } = await supabase
      .from('powerbi_reports')
      .select('powerbi_report_id, powerbi_workspace_id')
      .eq('id', reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
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

    // Fetch report pages
    const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${report.powerbi_workspace_id}/reports/${report.powerbi_report_id}/pages`;
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

    return NextResponse.json({
      pages: pagesData.value || [],
    });

  } catch (error: any) {
    console.error('Error in GET /api/super-admin/powerbi/reports/[reportId]/pages:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
