import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// GET /api/powerbi/test
// Test endpoint to verify PowerBI environment variables are configured
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.POWERBI_CLIENT_ID;
    const clientSecret = process.env.POWERBI_CLIENT_SECRET;
    const tenantId = process.env.POWERBI_TENANT_ID;

    return NextResponse.json({
      configured: {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        tenantId: !!tenantId,
      },
      lengths: {
        clientId: clientId?.length || 0,
        clientSecret: clientSecret?.length || 0,
        tenantId: tenantId?.length || 0,
      },
      // Show first few characters to verify they're loading
      preview: {
        clientId: clientId?.substring(0, 8) || 'missing',
        tenantId: tenantId?.substring(0, 8) || 'missing',
      },
    });
  } catch (error) {
    console.error('Error in PowerBI test:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
