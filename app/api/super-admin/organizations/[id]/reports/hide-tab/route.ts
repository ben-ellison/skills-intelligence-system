import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[hide-tab API] Request received');
    console.log('[hide-tab API] params before await:', params);

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const awaitedParams = await params;
    console.log('[hide-tab API] params after await:', awaitedParams);

    const { id: organizationId } = awaitedParams;
    console.log('[hide-tab API] organizationId extracted:', organizationId);

    const body = await request.json();
    console.log('[hide-tab API] Request body:', body);
    const { moduleId, moduleName, tabName, globalTabId } = body;

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Ensure organization_modules record exists
    let orgModuleId = moduleId;

    if (!orgModuleId) {
      // Find or create organization module
      const { data: existingOrgModule } = await supabase
        .from('organization_modules')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', moduleName)
        .maybeSingle();

      if (existingOrgModule) {
        orgModuleId = existingOrgModule.id;
      } else {
        // Create organization module
        const { data: newOrgModule, error: moduleError } = await supabase
          .from('organization_modules')
          .insert({
            organization_id: organizationId,
            name: moduleName,
            is_active: true,
          })
          .select('id')
          .single();

        if (moduleError) throw moduleError;
        orgModuleId = newOrgModule.id;
      }
    }

    // Create hidden tenant_module_tabs record
    const { data: hiddenTab, error: tabError } = await supabase
      .from('tenant_module_tabs')
      .insert({
        organization_id: organizationId,
        module_id: orgModuleId,
        tab_name: tabName,
        hidden_global_tab_id: globalTabId,
        override_mode: 'hidden',
        is_active: false, // Mark as inactive to hide it
        sort_order: 999, // Put at end
      })
      .select()
      .single();

    if (tabError) throw tabError;

    return NextResponse.json({
      success: true,
      message: 'Tab hidden successfully',
      tab: hiddenTab,
    });
  } catch (error: any) {
    console.error('Error hiding tab:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to hide tab' },
      { status: 500 }
    );
  }
}
