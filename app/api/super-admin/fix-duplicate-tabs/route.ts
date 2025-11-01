import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is super admin
    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get PrimaryGoal organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subdomain')
      .eq('subdomain', 'primarygoal')
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'PrimaryGoal organization not found' }, { status: 404 });
    }

    // Get count of duplicate tabs before deletion
    const { data: beforeTabs, error: countError } = await supabase
      .from('tenant_module_tabs')
      .select('id, tab_name, override_mode')
      .eq('organization_id', org.id)
      .eq('override_mode', 'add');

    if (countError) {
      return NextResponse.json({ error: 'Failed to count tabs' }, { status: 500 });
    }

    console.log(`Found ${beforeTabs?.length || 0} duplicate tenant tabs to delete`);

    // Delete duplicate tenant tabs
    const { data: deleted, error: deleteError } = await supabase
      .from('tenant_module_tabs')
      .delete()
      .eq('organization_id', org.id)
      .eq('override_mode', 'add')
      .select();

    if (deleteError) {
      console.error('Error deleting duplicate tabs:', deleteError);
      return NextResponse.json({ error: 'Failed to delete duplicate tabs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted?.length || 0} duplicate tenant tabs`,
      organization: org.name,
      deletedTabs: deleted?.map(t => t.tab_name) || [],
    });
  } catch (error) {
    console.error('Error fixing duplicate tabs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
