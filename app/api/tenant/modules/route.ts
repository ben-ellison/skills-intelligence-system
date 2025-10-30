import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/tenant/modules
// Get the effective modules for the current user's organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Get all organization modules
    const { data: orgModules, error: modulesError } = await supabase
      .rpc('get_modules_for_organization', {
        p_organization_id: user.organization_id,
      });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    // Get user's accessible modules based on role permissions
    const { data: accessibleModules, error: permissionsError } = await supabase
      .rpc('get_accessible_modules_for_user', {
        p_user_id: user.id,
      });

    if (permissionsError) {
      console.error('Error fetching accessible modules:', permissionsError);
      // If error getting permissions, fall back to showing all org modules
      return NextResponse.json(orgModules || []);
    }

    // If user has no role permissions, return empty array
    if (!accessibleModules || accessibleModules.length === 0) {
      return NextResponse.json([]);
    }

    // Filter organization modules to only those the user has access to
    const accessibleModuleNames = new Set(
      accessibleModules.map((m: any) => m.module_name)
    );

    const filteredModules = (orgModules || []).filter((module: any) =>
      accessibleModuleNames.has(module.name)
    );

    return NextResponse.json(filteredModules);
  } catch (error) {
    console.error('Error in GET modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
