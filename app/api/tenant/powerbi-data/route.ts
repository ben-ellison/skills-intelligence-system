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

    // Use PowerBI executeQueries API to get data
    // This gets the underlying data from the report
    const queriesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/executeQueries`;

    // Execute a simple query to get all data from the first page
    const queryResponse = await fetch(queriesUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries: [
          {
            query: "EVALUATE TOPN(100, ALLSELECTED())"
          }
        ],
        serializerSettings: {
          includeNulls: false
        }
      })
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('PowerBI query failed:', errorText);

      // Fallback: Try to get pages and visual data
      const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${deployedReport.powerbi_workspace_id}/reports/${deployedReport.powerbi_report_id}/pages`;
      const pagesResponse = await fetch(pagesUrl, {
        headers: { 'Authorization': `Bearer ${access_token}` },
      });

      if (pagesResponse.ok) {
        const pages = await pagesResponse.json();
        return NextResponse.json({
          source: 'pages_metadata',
          reportName: templateReport.name,
          pages: pages.value,
          note: 'Full data export not available. Using page metadata. For detailed data, connect to data source directly.'
        });
      }

      return NextResponse.json(
        { error: 'Unable to extract report data', details: errorText },
        { status: 500 }
      );
    }

    const queryData = await queryResponse.json();

    return NextResponse.json({
      source: 'powerbi_query',
      reportName: templateReport.name,
      roleName: role.display_name,
      data: queryData,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error in GET /api/tenant/powerbi-data:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
