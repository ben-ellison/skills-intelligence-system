import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import TenantNavigation from './components/TenantNavigation';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  console.log('[Tenant Layout] Session check:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userEmail: session?.user?.email,
    isSuperAdmin: (session?.user as any)?.isSuperAdmin
  });

  if (!session) {
    console.log('[Tenant Layout] No session - redirecting to signin');
    redirect('/api/auth/signin');
  }

  // Get subdomain from middleware headers
  const headersList = headers();
  const subdomain = headersList.get('x-subdomain');

  if (subdomain) {
    const supabase = createAdminClient();

    console.log(`[Tenant Layout] Processing subdomain: ${subdomain}`);
    console.log(`[Tenant Layout] Session user email: ${session.user?.email}`);

    // Get the organization for this subdomain
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (orgError || !organization) {
      console.error(`[Tenant Layout] Organization not found for subdomain: ${subdomain}`, orgError);
      redirect('/api/auth/signout');
    }

    console.log(`[Tenant Layout] Found organization ID: ${organization.id}`);

    // Check if user belongs to this organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id, is_super_admin')
      .eq('email', session.user?.email || '')
      .single();

    console.log(`[Tenant Layout] User lookup result:`, {
      found: !!user,
      error: userError?.message,
      email: session.user?.email,
      organizationId: user?.organization_id,
      isSuperAdmin: user?.is_super_admin
    });

    // Super admins can access any tenant for support purposes
    if (user?.is_super_admin) {
      console.log(`[Tenant Layout] ✅ Super admin ${session.user?.email} accessing tenant: ${subdomain}`);
    } else if (!user) {
      console.error(`[Tenant Layout] ❌ User not found in database: ${session.user?.email}`);
      redirect('/api/auth/signout');
    } else if (user.organization_id !== organization.id) {
      // User doesn't belong to this organization - sign them out
      console.error(`[Tenant Layout] ❌ Unauthorized tenant access attempt`, {
        user: session.user?.email,
        subdomain,
        userOrgId: user?.organization_id,
        requiredOrgId: organization.id,
        isSuperAdmin: user?.is_super_admin
      });
      redirect('/api/auth/signout');
    } else {
      console.log(`[Tenant Layout] ✅ Regular user ${session.user?.email} accessing their tenant: ${subdomain}`);
    }
  }

  return (
    <TenantNavigation session={session}>
      {children}
    </TenantNavigation>
  );
}
