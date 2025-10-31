import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user's organization
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[Latest Summary] Fetching for user:', {
      userId: user.id,
      organizationId: user.organization_id
    });

    // Get latest summary for this user's organization
    const { data: summary, error } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Latest Summary] Error fetching:', error);
      return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
    }

    console.log('[Latest Summary] Found summary:', {
      found: !!summary,
      summaryId: summary?.id,
      createdAt: summary?.created_at,
      textLength: summary?.summary_text?.length
    });

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error in latest summary API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
