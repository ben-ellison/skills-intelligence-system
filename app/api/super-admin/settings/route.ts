import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { powerbiMasterWorkspaceId, powerbiMasterWorkspaceName } = body;

    const supabase = createAdminClient();

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('system_settings')
      .select('id')
      .single();

    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          powerbi_master_workspace_id: powerbiMasterWorkspaceId || null,
          powerbi_master_workspace_name: powerbiMasterWorkspaceName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json(
          { error: 'Failed to update settings' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('system_settings')
        .insert({
          powerbi_master_workspace_id: powerbiMasterWorkspaceId || null,
          powerbi_master_workspace_name: powerbiMasterWorkspaceName || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating settings:', error);
        return NextResponse.json(
          { error: 'Failed to create settings' },
          { status: 500 }
        );
      }

      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST /api/super-admin/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
