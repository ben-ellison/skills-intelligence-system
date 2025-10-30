import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import GlobalRolesPageWrapper from './page-wrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Roles',
};

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

  // Fetch all global modules
  const { data: modules } = await supabase
    .from('global_modules')
    .select('*')
    .order('sort_order', { ascending: true });

  // Fetch all module tabs (global tabs only)
  const { data: tabs } = await supabase
    .from('module_tabs')
    .select('*')
    .eq('is_active', true)
    .order('module_name', { ascending: true })
    .order('sort_order', { ascending: true });

  // Enrich tabs with module display names
  const enrichedTabs = tabs?.map(tab => {
    const module = modules?.find(m => m.name === tab.module_name);
    return {
      ...tab,
      global_modules: module ? { display_name: module.display_name } : null
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <GlobalRolesPageWrapper
          initialRoles={roles || []}
          globalModules={modules || []}
          moduleTabs={enrichedTabs || []}
        />
      </div>
    </div>
  );
}
