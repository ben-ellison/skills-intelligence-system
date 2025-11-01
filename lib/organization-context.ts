import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Get the organization ID for the current request
 * Uses subdomain to determine organization for multi-tenant access
 * Falls back to user's organization for main domain
 */
export async function getOrganizationId(
  request: NextRequest,
  userEmail: string
): Promise<{ organizationId: string | null; error: string | null }> {
  const supabase = createAdminClient();

  // Check if we have a subdomain from middleware
  const subdomain = request.headers.get('x-subdomain');

  console.log(`[Get Organization] Subdomain: ${subdomain}, User: ${userEmail}`);

  if (subdomain) {
    // Multi-tenant: Get organization by subdomain
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (orgError || !org) {
      console.error(`[Get Organization] Failed to find org for subdomain: ${subdomain}`, orgError);
      return {
        organizationId: null,
        error: `Organization not found for subdomain: ${subdomain}`
      };
    }

    console.log(`[Get Organization] Using organization from subdomain: ${subdomain} -> ${org.id}`);
    return { organizationId: org.id, error: null };
  } else {
    // Main domain: Get user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', userEmail)
      .single();

    if (userError || !user?.organization_id) {
      console.error(`[Get Organization] Failed to find user organization:`, userError);
      return {
        organizationId: null,
        error: 'User not associated with an organization'
      };
    }

    console.log(`[Get Organization] Using user's organization: ${user.organization_id}`);
    return { organizationId: user.organization_id, error: null };
  }
}
