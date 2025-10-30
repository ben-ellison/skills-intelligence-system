import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { action } = body;

    // Update system settings
    if (action === 'update_settings') {
      const { azureEndpoint, deploymentName, apiVersion, aiEnabled } = body;

      const { error } = await supabase
        .from('system_settings')
        .update({
          azure_openai_endpoint: azureEndpoint,
          azure_openai_deployment_name: deploymentName,
          azure_openai_api_version: apiVersion,
          ai_enabled: aiEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('system_settings').select('id').single()).data?.id);

      if (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Create new prompt
    if (action === 'create_prompt') {
      const { roleId, promptName, promptText, promptType, isActive, powerbiReportId, powerbiPageNames } = body;

      const { error } = await supabase
        .from('ai_prompts')
        .insert({
          role_id: roleId || null,
          prompt_name: promptName,
          prompt_text: promptText,
          prompt_type: promptType,
          is_active: isActive,
          powerbi_report_id: powerbiReportId || null,
          powerbi_page_names: powerbiPageNames || [],
        });

      if (error) {
        console.error('Error creating prompt:', error);
        return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Update existing prompt
    if (action === 'update_prompt') {
      const { promptId, roleId, promptName, promptText, promptType, isActive, powerbiReportId, powerbiPageNames } = body;

      const { error } = await supabase
        .from('ai_prompts')
        .update({
          role_id: roleId || null,
          prompt_name: promptName,
          prompt_text: promptText,
          prompt_type: promptType,
          is_active: isActive,
          powerbi_report_id: powerbiReportId || null,
          powerbi_page_names: powerbiPageNames || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', promptId);

      if (error) {
        console.error('Error updating prompt:', error);
        return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in AI settings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
