import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and Super Admin status
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, subdomain, lmsProviderId, englishMathsProviderId, crmProviderId, hrProviderId, powerbiWorkspaceId, powerbiWorkspaceName, billingEmail, billingContactName } = body;

    // Validate required fields
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: 'Name and subdomain are required' },
        { status: 400 }
      );
    }

    // LMS provider is required
    if (!lmsProviderId) {
      return NextResponse.json(
        { error: 'LMS provider is required' },
        { status: 400 }
      );
    }

    // PowerBI workspace is required
    if (!powerbiWorkspaceId || !powerbiWorkspaceName) {
      return NextResponse.json(
        { error: 'PowerBI workspace ID and name are required' },
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

    // Validate subdomain format (lowercase, alphanumeric, hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if subdomain is already taken
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 400 }
      );
    }

    // Create organization with category-based integrations
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name,
        subdomain,
        lms_provider_id: lmsProviderId,
        english_maths_provider_id: englishMathsProviderId || null,
        crm_provider_id: crmProviderId || null,
        hr_provider_id: hrProviderId || null,
        powerbi_workspace_id: powerbiWorkspaceId,
        powerbi_workspace_name: powerbiWorkspaceName,
        powerbi_workspace_created_at: new Date().toISOString(),
        billing_email: billingEmail || null,
        billing_contact_name: billingContactName || null,
        current_learner_count: 0,
        max_learner_count_this_period: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Initialize modules for the new organization
    const { data: moduleResult, error: moduleError } = await supabase
      .rpc('initialize_organization_modules', { org_id: newOrg.id });

    if (moduleError) {
      console.error('Error initializing organization modules:', moduleError);
      // Don't fail the request, but log the error
      console.warn('Organization created but module initialization failed. Modules can be initialized later.');
    } else {
      console.log(`Successfully initialized ${moduleResult} modules for organization ${newOrg.id}`);
    }

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/super-admin/organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and Super Admin status
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Fetch all organizations with subscription counts
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        *,
        subscriptions (
          id,
          status
        ),
        users (
          id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // Transform data to include counts
    const orgsWithCounts = organizations?.map(org => ({
      ...org,
      userCount: org.users?.length || 0,
      activeSubscriptions: org.subscriptions?.filter((s: any) => s.status === 'active').length || 0,
    }));

    return NextResponse.json(orgsWithCounts || []);
  } catch (error) {
    console.error('Error in GET /api/super-admin/organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
