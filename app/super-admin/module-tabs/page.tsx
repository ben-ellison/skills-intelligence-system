import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import ModuleTabsPageWrapper from './page-wrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Module Tabs',
};


export default async function ModuleTabsPage() {
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

  // Fetch all module tabs
  const { data: moduleTabs } = await supabase
    .from('module_tabs')
    .select(`
      *,
      report:powerbi_reports(id, name)
    `)
    .order('module_name', { ascending: true })
    .order('sort_order', { ascending: true });

  // Fetch all available PowerBI reports
  const { data: reports } = await supabase
    .from('powerbi_reports')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  // Fetch all global modules
  const { data: globalModules } = await supabase
    .from('global_modules')
    .select('name, display_name')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  return (
    <ModuleTabsPageWrapper
      initialData={{
        moduleTabs: moduleTabs || [],
        reports: reports || [],
        modules: globalModules || [],
      }}
    />
  );
}
