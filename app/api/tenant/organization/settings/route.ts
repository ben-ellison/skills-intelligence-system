import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

// GET /api/tenant/organization/settings
// Get organization settings for the current tenant admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get organization ID based on subdomain
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get user's permissions
    const { data: user } = await supabase
      .from('users')
      .select('is_tenant_admin')
      .eq('email', session.user.email)
      .single();

    if (!user?.is_tenant_admin && !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only tenant admins can view organization settings' },
        { status: 403 }
      );
    }

    const { data: organization, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, powerbi_workspace_id')
      .eq('id', organizationId)
      .single();

    if (fetchError) {
      console.error('Error fetching organization:', fetchError);
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

    // Get organization ID based on subdomain
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get user's permissions
    const { data: user } = await supabase
      .from('users')
      .select('is_tenant_admin')
      .eq('email', session.user.email)
      .single();

    if (!user?.is_tenant_admin && !session.user.isSuperAdmin) {
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
      .eq('id', organizationId)
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
