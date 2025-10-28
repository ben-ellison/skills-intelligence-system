import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import GlobalModulesPageWrapper from './page-wrapper';

export default async function GlobalModulesPage() {
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

  // Fetch all global modules
  const { data: modules } = await supabase
    .from('global_modules')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <GlobalModulesPageWrapper
      initialModules={modules || []}
    />
  );
}
