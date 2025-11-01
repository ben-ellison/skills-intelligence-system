import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get organization details
    const { data: organization, error: fetchOrgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (fetchOrgError) {
      console.error('Error fetching organization:', fetchOrgError);
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error in GET /api/tenant-admin/organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, billing_email, billing_contact_name } = body;

    // Update organization
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        name: name || undefined,
        billing_email: billing_email || null,
        billing_contact_name: billing_contact_name || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Organization updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/tenant-admin/organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
