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
    const { name, subdomain, databaseSchemaId, lmsProviderId, englishMathsProviderId, crmProviderId, hrProviderId, powerbiWorkspaceId, powerbiWorkspaceName, billingEmail, billingContactName } = body;

    // Validate required fields
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: 'Name and subdomain are required' },
        { status: 400 }
      );
    }

    // Database schema is required
    if (!databaseSchemaId) {
      return NextResponse.json(
        { error: 'Database schema is required' },
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

    // PowerBI workspace is optional - validate format if provided
    if (powerbiWorkspaceId) {
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(powerbiWorkspaceId)) {
        return NextResponse.json(
          { error: 'PowerBI Workspace ID must be a valid GUID' },
          { status: 400 }
        );
      }
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
    const { data: newOrg, error: createError} = await supabase
      .from('organizations')
      .insert({
        name,
        subdomain,
        database_schema_id: databaseSchemaId,
        lms_provider_id: lmsProviderId,
        english_maths_provider_id: englishMathsProviderId || null,
        crm_provider_id: crmProviderId || null,
        hr_provider_id: hrProviderId || null,
        powerbi_workspace_id: powerbiWorkspaceId || null,
        powerbi_workspace_name: powerbiWorkspaceName || null,
        powerbi_workspace_created_at: powerbiWorkspaceId ? new Date().toISOString() : null,
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

    // Create GoDaddy DNS CNAME record for subdomain
    try {
      const godaddyResponse = await fetch(
        `https://api.godaddy.com/v1/domains/skillsintelligencesystem.co.uk/records/CNAME/${subdomain}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            data: 'cname.vercel-dns.com',
            ttl: 600,
          }]),
        }
      );

      if (!godaddyResponse.ok) {
        const errorText = await godaddyResponse.text();
        console.error('GoDaddy DNS creation failed:', errorText);
        console.warn(`Organization created but DNS record creation failed for ${subdomain}.skillsintelligencesystem.co.uk`);
      } else {
        console.log(`Successfully created DNS CNAME record for ${subdomain}.skillsintelligencesystem.co.uk`);
      }
    } catch (dnsError) {
      console.error('Error creating GoDaddy DNS record:', dnsError);
      console.warn('Organization created but DNS record creation failed. Domain can be configured manually.');
    }

    // Clone global tabs to this organization
    const { data: globalTabs } = await supabase
      .from('module_tabs')
      .select('*')
      .eq('is_active', true);

    if (globalTabs && globalTabs.length > 0) {
      const deployedTabs = globalTabs.map(tab => ({
        organization_id: newOrg.id,
        module_name: tab.module_name,
        tab_name: tab.tab_name,
        sort_order: tab.sort_order,
        report_id: tab.report_id,
        page_name: tab.page_name,
        is_active: true,
      }));

      const { error: tabsError } = await supabase
        .from('organization_deployed_tabs')
        .insert(deployedTabs);

      if (tabsError) {
        console.error('Error cloning global tabs:', tabsError);
        console.warn('Organization created but global tabs cloning failed. Tabs can be deployed manually.');
      } else {
        console.log(`Successfully cloned ${deployedTabs.length} global tabs for organization ${newOrg.id}`);
      }
    }

    // Auto-assign current super admin user to the new organization
    if (session.user?.email) {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (existingUser) {
        // Update user to add organization_id
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ organization_id: newOrg.id, is_super_admin: true })
          .eq('id', existingUser.id);

        if (userUpdateError) {
          console.error('Error assigning super admin to organization:', userUpdateError);
          console.warn('Organization created but super admin assignment failed.');
        } else {
          console.log(`Successfully assigned super admin ${session.user.email} to organization ${newOrg.id}`);
        }
      } else {
        // Create new user record
        const { error: userCreateError } = await supabase
          .from('users')
          .insert({
            email: session.user.email,
            organization_id: newOrg.id,
            is_super_admin: true,
            is_tenant_admin: true,
          });

        if (userCreateError) {
          console.error('Error creating super admin user:', userCreateError);
          console.warn('Organization created but super admin user creation failed.');
        } else {
          console.log(`Successfully created super admin user ${session.user.email} for organization ${newOrg.id}`);
        }
      }
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
