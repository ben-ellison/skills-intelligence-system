import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { roleId, prioritiesData } = body;

    if (!roleId || !prioritiesData) {
      return NextResponse.json(
        { error: 'Missing required fields: roleId and prioritiesData' },
        { status: 400 }
      );
    }

    // Fetch system settings to check if AI is enabled
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (!systemSettings?.ai_enabled) {
      return NextResponse.json(
        { error: 'AI features are not enabled' },
        { status: 403 }
      );
    }

    // Validate Azure OpenAI configuration
    const endpoint = systemSettings.azure_openai_endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentName = systemSettings.azure_openai_deployment_name || process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = systemSettings.azure_openai_api_version || process.env.AZURE_OPENAI_API_VERSION;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    console.log('Azure OpenAI Config:', {
      endpoint: endpoint ? 'SET' : 'MISSING',
      deploymentName: deploymentName ? 'SET' : 'MISSING',
      apiVersion: apiVersion ? 'SET' : 'MISSING',
      apiKey: apiKey ? 'SET' : 'MISSING',
      fromDB: {
        endpoint: systemSettings.azure_openai_endpoint ? 'SET' : 'MISSING',
        deploymentName: systemSettings.azure_openai_deployment_name ? 'SET' : 'MISSING',
        apiVersion: systemSettings.azure_openai_api_version ? 'SET' : 'MISSING',
      }
    });

    if (!endpoint || !deploymentName || !apiVersion || !apiKey) {
      return NextResponse.json(
        { error: 'Azure OpenAI is not properly configured' },
        { status: 500 }
      );
    }

    // Fetch the prompt for the specified role
    const { data: prompt, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('role_id', roleId)
      .eq('is_active', true)
      .eq('prompt_type', 'daily_summary')
      .single();

    if (promptError || !prompt) {
      return NextResponse.json(
        { error: 'No active prompt found for this role' },
        { status: 404 }
      );
    }

    // Replace placeholder with actual data
    const fullPrompt = prompt.prompt_text.replace(
      '{priorities_data}',
      JSON.stringify(prioritiesData, null, 2)
    );

    // Call Azure OpenAI API
    const azureUrl = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    const azureResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for apprenticeship training organizations.',
          },
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      console.error('Azure OpenAI API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate summary from Azure OpenAI' },
        { status: 500 }
      );
    }

    const azureData = await azureResponse.json();
    const summaryText = azureData.choices[0]?.message?.content;
    const tokensUsed = azureData.usage?.total_tokens || 0;

    if (!summaryText) {
      return NextResponse.json(
        { error: 'No summary generated' },
        { status: 500 }
      );
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth0_user_id', session.user.sub)
      .single();

    // Store the summary in the database
    const { data: savedSummary, error: saveError } = await supabase
      .from('ai_summaries')
      .insert({
        organization_id: userData?.organization_id,
        user_id: session.user.id,
        role_id: roleId,
        summary_text: summaryText,
        summary_date: new Date().toISOString().split('T')[0],
        data_snapshot: prioritiesData,
        prompt_used: fullPrompt,
        tokens_used: tokensUsed,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
      // Still return the summary even if saving failed
      return NextResponse.json({
        summary: summaryText,
        tokensUsed,
        warning: 'Summary generated but not saved to database',
      });
    }

    return NextResponse.json({
      summary: summaryText,
      tokensUsed,
      summaryId: savedSummary.id,
      createdAt: savedSummary.created_at,
    });
  } catch (error: any) {
    console.error('Error in generate-summary API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
