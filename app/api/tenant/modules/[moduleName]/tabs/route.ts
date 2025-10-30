import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/tenant/modules/[moduleName]/tabs
// Get the effective tabs for a module (global defaults + tenant overrides)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleName } = await params;
    const supabase = createAdminClient();

    // Get user's organization and ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user?.organization_id) {
      return NextResponse.json(
        { error: 'User not properly configured' },
        { status: 404 }
      );
    }

    // Get the module ID for this organization
    const { data: module, error: moduleError } = await supabase
      .from('organization_modules')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('name', moduleName)
      .eq('is_active', true)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Module not found or not accessible' },
        { status: 404 }
      );
    }

    // Use the helper function to get effective tabs
    const { data: allTabs, error: tabsError } = await supabase
      .rpc('get_module_tabs_for_tenant', {
        p_organization_id: user.organization_id,
        p_module_id: module.id,
        p_module_name: moduleName,
      });

    if (tabsError) {
      console.error('Error fetching module tabs:', tabsError);
      return NextResponse.json(
        { error: 'Failed to fetch module tabs' },
        { status: 500 }
      );
    }

    // Get user's accessible tabs based on role permissions
    const { data: accessibleTabs, error: permissionsError } = await supabase
      .rpc('get_accessible_tabs_for_user', {
        p_user_id: user.id,
        p_module_name: moduleName,
      });

    if (permissionsError) {
      console.error('Error fetching accessible tabs:', permissionsError);
      // If error getting permissions, fall back to showing all org tabs
      return NextResponse.json(allTabs || []);
    }

    // If user has no tab permissions, return empty array
    if (!accessibleTabs || accessibleTabs.length === 0) {
      return NextResponse.json([]);
    }

    // Filter organization tabs to only those the user has access to
    const accessibleTabIds = new Set(
      accessibleTabs.map((t: any) => t.tab_id)
    );

    const filteredTabs = (allTabs || []).filter((tab: any) =>
      accessibleTabIds.has(tab.id)
    );

    return NextResponse.json(filteredTabs);
  } catch (error) {
    console.error('Error in GET module tabs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
