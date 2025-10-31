import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/ai-prompts?roleId=xxx
 *
 * Get AI prompt configuration for a role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json({ error: 'roleId required' }, { status: 400 });
    }

    // Get AI prompt for this role
    const { data: aiPrompt, error } = await supabase
      .from('ai_prompts')
      .select(`
        *,
        powerbi_reports (
          id,
          name,
          report_id,
          workspace_id
        )
      `)
      .eq('user_role_id', roleId)
      .eq('is_active', true)
      .eq('prompt_type', 'daily_summary')
      .maybeSingle();

    if (error) {
      console.error('[AI Prompts API] Error fetching prompt:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ aiPrompt });
  } catch (error: any) {
    console.error('[AI Prompts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
