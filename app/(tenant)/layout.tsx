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

  if (!session) {
    redirect('/api/auth/signin');
  }

  // Get subdomain from middleware headers
  const headersList = headers();
  const subdomain = headersList.get('x-subdomain');

  if (subdomain) {
    const supabase = createAdminClient();

    // Get the organization for this subdomain
    const { data: organization } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (!organization) {
      console.error(`[Tenant Layout] Organization not found for subdomain: ${subdomain}`);
      redirect('/api/auth/signout');
    }

    // Check if user belongs to this organization
    const { data: user } = await supabase
      .from('users')
      .select('organization_id, is_super_admin')
      .eq('email', session.user?.email || '')
      .single();

    // Super admins can access any tenant for support purposes
    if (user?.is_super_admin) {
      console.log(`[Tenant Layout] Super admin ${session.user?.email} accessing tenant: ${subdomain}`);
    } else if (!user || user.organization_id !== organization.id) {
      // User doesn't belong to this organization - sign them out
      console.error(`[Tenant Layout] Unauthorized tenant access attempt`, {
        user: session.user?.email,
        subdomain,
        userOrgId: user?.organization_id,
        requiredOrgId: organization.id
      });
      redirect('/api/auth/signout');
    }
  }

  return (
    <TenantNavigation session={session}>
      {children}
    </TenantNavigation>
  );
}
