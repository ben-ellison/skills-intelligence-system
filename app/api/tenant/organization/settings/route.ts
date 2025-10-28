import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/tenant/organization/settings
// Get organization settings for the current tenant admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id, is_tenant_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user?.organization_id) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 404 }
      );
    }

    if (!user.is_tenant_admin && !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only tenant admins can view organization settings' },
        { status: 403 }
      );
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, powerbi_workspace_id')
      .eq('id', user.organization_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organization' },
        { status: 500 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error in GET organization settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tenant/organization/settings
// Update organization settings (tenant admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id, is_tenant_admin')
      .eq('email', session.user.email)
      .single();

    if (userError || !user?.organization_id) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 404 }
      );
    }

    if (!user.is_tenant_admin && !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only tenant admins can update organization settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { powerbi_workspace_id } = body;

    const updateData: any = {};
    if (powerbi_workspace_id !== undefined) {
      updateData.powerbi_workspace_id = powerbi_workspace_id;
    }

    const { data: organization, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', user.organization_id)
      .select('id, name, powerbi_workspace_id')
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error in PATCH organization settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
