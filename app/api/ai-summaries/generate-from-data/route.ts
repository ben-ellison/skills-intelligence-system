import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@supabase/supabase-js';
import { generateAISummary } from '@/lib/ai/generate-summary';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/ai-summaries/generate-from-data
 *
 * Generates AI summary from PowerBI data extracted client-side
 *
 * Body:
 * {
 *   aiPromptId: string,
 *   extractedData: PowerBIVisualData[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { aiPromptId, extractedData } = body;

    if (!aiPromptId || !extractedData) {
      return NextResponse.json(
        { error: 'Missing aiPromptId or extractedData' },
        { status: 400 }
      );
    }

    console.log(`[Generate from Data] Generating summary for prompt ${aiPromptId}`);
    console.log(`[Generate from Data] Received ${extractedData.visuals?.length || 0} visuals`);

    // Get the AI prompt and tenant info
    const { data: aiPrompt, error: promptError } = await supabase
      .from('ai_prompts')
      .select(`
        *,
        tenants (id, name, subdomain),
        user_roles (id, name, level),
        powerbi_reports (id, name, report_id, workspace_id)
      `)
      .eq('id', aiPromptId)
      .single();

    if (promptError || !aiPrompt) {
      console.error('[Generate from Data] Failed to fetch AI prompt:', promptError);
      return NextResponse.json(
        { error: 'AI prompt not found' },
        { status: 404 }
      );
    }

    // Check user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id, user_role_id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', aiPrompt.tenant_id)
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'Unauthorized access to tenant' },
        { status: 403 }
      );
    }

    // Format the extracted data for the AI
    const powerbiContext = {
      source: 'powerbi_visuals_client_extraction',
      reportName: (aiPrompt.powerbi_reports as any)?.name || 'Unknown',
      selectedPages: aiPrompt.powerbi_page_names || [],
      visuals: extractedData.visuals,
      visualCount: extractedData.visuals?.length || 0,
      pageCount: extractedData.pageCount || 0,
      timestamp: new Date().toISOString()
    };

    console.log('[Generate from Data] Formatted PowerBI context:', {
      source: powerbiContext.source,
      visualCount: powerbiContext.visualCount,
      pageCount: powerbiContext.pageCount
    });

    // Generate the AI summary
    const summary = await generateAISummary(
      aiPrompt.prompt_text,
      powerbiContext,
      aiPrompt.tenants?.name || 'Unknown Tenant',
      aiPrompt.user_roles?.name || 'Unknown Role'
    );

    // Save the summary to the database
    const { data: savedSummary, error: saveError } = await supabase
      .from('ai_summaries')
      .insert({
        ai_prompt_id: aiPromptId,
        tenant_id: aiPrompt.tenant_id,
        user_role_id: aiPrompt.user_role_id,
        summary_text: summary,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Generate from Data] Failed to save summary:', saveError);
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      );
    }

    console.log('[Generate from Data] Summary generated and saved successfully');

    return NextResponse.json({
      success: true,
      summary: savedSummary,
      visualCount: powerbiContext.visualCount,
      pageCount: powerbiContext.pageCount
    });

  } catch (error: any) {
    console.error('[Generate from Data] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', message: error.message },
      { status: 500 }
    );
  }
}
