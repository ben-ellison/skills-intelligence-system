import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import ModulesPageWrapper from './page-wrapper';

export default async function OrganizationModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Check if user is a Super Admin
  if (!session.user?.isSuperAdmin) {
    redirect('/dashboard');
  }

  const { id: organizationId } = await params;
  const supabase = createAdminClient();

  // Fetch organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, subdomain')
    .eq('id', organizationId)
    .single();

  if (!organization) {
    redirect('/super-admin');
  }

  // Fetch organization modules
  const { data: modules } = await supabase
    .from('organization_modules')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true });

  return (
    <ModulesPageWrapper
      organization={organization}
      initialModules={modules || []}
    />
  );
}
