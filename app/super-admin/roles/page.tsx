import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import GlobalRolesPageWrapper from './page-wrapper';

export default async function GlobalRolesPage() {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Check if user is a Super Admin
  if (!session.user?.isSuperAdmin) {
    redirect('/dashboard');
  }

  const supabase = createAdminClient();

  // Fetch all global roles
  const { data: roles } = await supabase
    .from('global_roles')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <GlobalRolesPageWrapper initialRoles={roles || []} />
      </div>
    </div>
  );
}
