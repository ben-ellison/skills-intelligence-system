import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting daily AI summary generation...');

    const supabase = createAdminClient();

    // Get all active users with roles
    const { data: users } = await supabase
      .from('users')
      .select('id, email, organization_id, primary_role_id')
      .not('primary_role_id', 'is', null);

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' });
    }

    const results = [];

    for (const user of users) {
      try {
        // Generate summary for this user
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generate-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roleId: user.primary_role_id,
            fetchPowerBIData: true, // Will use metadata since no browser available
            userId: user.id, // Pass user ID for cron context
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            userId: user.id,
            email: user.email,
            status: 'success',
            summaryId: data.summaryId
          });
          console.log(`[Cron] Generated summary for user ${user.email}`);
        } else {
          const errorData = await response.json();
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: errorData.error
          });
          console.error(`[Cron] Failed to generate summary for user ${user.email}:`, errorData.error);
        }
      } catch (error: any) {
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error.message
        });
        console.error(`[Cron] Error generating summary for user ${user.email}:`, error);
      }
    }

    console.log('[Cron] Daily AI summary generation completed');

    return NextResponse.json({
      message: 'Daily summaries generated',
      totalUsers: users.length,
      results
    });
  } catch (error: any) {
    console.error('[Cron] Error in daily summary generation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
