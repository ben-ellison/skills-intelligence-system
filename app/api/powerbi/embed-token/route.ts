import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// POST /api/powerbi/embed-token
// Get PowerBI embed token for a specific report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, workspaceId } = await request.json();

    if (!reportId || !workspaceId) {
      return NextResponse.json(
        { error: 'reportId and workspaceId are required' },
        { status: 400 }
      );
    }

    // Check if PowerBI credentials are configured
    const clientId = process.env.POWERBI_CLIENT_ID;
    const clientSecret = process.env.POWERBI_CLIENT_SECRET;
    const tenantId = process.env.POWERBI_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      return NextResponse.json({
        error: 'PowerBI integration not configured',
        message:
          'PowerBI Embedded requires Azure AD credentials. Please configure POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET, and POWERBI_TENANT_ID environment variables.',
        reportId,
        workspaceId,
      });
    }

    // Step 1: Get Azure AD access token
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
      console.error('Failed to get Azure AD token:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with Azure AD', details: error },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Generate PowerBI embed token
    const embedTokenUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;

    const embedResponse = await fetch(embedTokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessLevel: 'View',
      }),
    });

    if (!embedResponse.ok) {
      const error = await embedResponse.text();
      console.error('Failed to generate embed token:', error);
      return NextResponse.json(
        { error: 'Failed to generate PowerBI embed token', details: error },
        { status: 500 }
      );
    }

    const embedData = await embedResponse.json();

    // Step 3: Get the embed URL
    const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;
    const reportResponse = await fetch(reportUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!reportResponse.ok) {
      const error = await reportResponse.text();
      console.error('Failed to get report details:', error);
      return NextResponse.json(
        { error: 'Failed to get report details', details: error },
        { status: 500 }
      );
    }

    const reportDetails = await reportResponse.json();

    return NextResponse.json({
      accessToken: embedData.token,
      embedUrl: reportDetails.embedUrl,
      expiration: embedData.expiration,
      tokenId: embedData.tokenId,
    });
  } catch (error) {
    console.error('Error generating embed token:', error);
    return NextResponse.json(
      { error: 'Failed to generate embed token', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
