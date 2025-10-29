import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and Super Admin status
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;
    const body = await request.json();
    const {
      powerbiWorkspaceId,
      powerbiWorkspaceName,
      billingEmail,
      billingContactName,
      initializeModules,
    } = body;

    // Validate PowerBI workspace fields if provided
    if (powerbiWorkspaceId || powerbiWorkspaceName) {
      if (!powerbiWorkspaceId || !powerbiWorkspaceName) {
        return NextResponse.json(
          { error: 'Both PowerBI Workspace ID and Name must be provided together' },
          { status: 400 }
        );
      }

      // Validate GUID format for workspace ID
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(powerbiWorkspaceId)) {
        return NextResponse.json(
          { error: 'PowerBI Workspace ID must be a valid GUID' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Check if organization exists
    const { data: existingOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('id, powerbi_workspace_id')
      .eq('id', organizationId)
      .single();

    if (fetchError || !existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (powerbiWorkspaceId !== undefined) {
      updateData.powerbi_workspace_id = powerbiWorkspaceId;
    }
    if (powerbiWorkspaceName !== undefined) {
      updateData.powerbi_workspace_name = powerbiWorkspaceName;
    }
    if (powerbiWorkspaceId && !existingOrg.powerbi_workspace_id) {
      updateData.powerbi_workspace_created_at = new Date().toISOString();
    }
    if (billingEmail !== undefined) {
      updateData.billing_email = billingEmail;
    }
    if (billingContactName !== undefined) {
      updateData.billing_contact_name = billingContactName;
    }

    // Update organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    // Initialize modules if requested and PowerBI workspace was just added
    if (initializeModules && powerbiWorkspaceId && !existingOrg.powerbi_workspace_id) {
      console.log(`Initializing modules for organization ${organizationId}...`);

      const { data: moduleResult, error: moduleError } = await supabase
        .rpc('initialize_organization_modules', { org_id: organizationId });

      if (moduleError) {
        console.error('Error initializing organization modules:', moduleError);
        return NextResponse.json(
          {
            success: true,
            organization: updatedOrg,
            warning: 'Organization updated but module initialization failed. Modules can be initialized later.',
            moduleError: moduleError.message,
          },
          { status: 200 }
        );
      }

      console.log(`Successfully initialized ${moduleResult} modules for organization ${organizationId}`);

      return NextResponse.json(
        {
          success: true,
          organization: updatedOrg,
          modulesInitialized: moduleResult,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(updatedOrg, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/organizations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and Super Admin status
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;
    const supabase = createAdminClient();

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error in GET /api/super-admin/organizations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;
    const supabase = createAdminClient();

    // Get organization details first
    const { data: org } = await supabase
      .from('organizations')
      .select('subdomain')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Delete organization (cascades to related tables via foreign keys)
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      );
    }

    // Optionally delete Vercel domain (best effort - don't fail if it errors)
    try {
      const domainName = `${org.subdomain}.skillsintelligencesystem.co.uk`;
      await fetch(
        `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domainName}?teamId=${process.env.VERCEL_TEAM_ID}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
          },
        }
      );
      console.log(`Deleted Vercel domain: ${domainName}`);
    } catch (vercelError) {
      console.warn('Failed to delete Vercel domain (non-critical):', vercelError);
    }

    // Optionally delete GoDaddy DNS record (best effort)
    try {
      await fetch(
        `https://api.godaddy.com/v1/domains/skillsintelligencesystem.co.uk/records/CNAME/${org.subdomain}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`,
          },
        }
      );
      console.log(`Deleted GoDaddy DNS record: ${org.subdomain}`);
    } catch (dnsError) {
      console.warn('Failed to delete GoDaddy DNS record (non-critical):', dnsError);
    }

    return NextResponse.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/organizations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
