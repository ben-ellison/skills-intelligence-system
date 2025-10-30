import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import AISettingsPageWrapper from './page-wrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Settings',
};

export default async function AISettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  if (!session.user?.isSuperAdmin) {
    redirect('/dashboard');
  }

  const supabase = createAdminClient();

  // Fetch system settings for Azure OpenAI configuration
  const { data: systemSettings } = await supabase
    .from('system_settings')
    .select('*')
    .single();

  // Fetch all active roles
  const { data: roles } = await supabase
    .from('global_roles')
    .select('id, name, display_name')
    .eq('is_active', true)
    .order('role_level', { ascending: true })
    .order('sort_order', { ascending: true });

  // Fetch all AI prompts with their PowerBI report info
  const { data: prompts } = await supabase
    .from('ai_prompts')
    .select(`
      *,
      powerbi_reports:powerbi_report_id (
        id,
        name,
        description
      )
    `)
    .order('created_at', { ascending: false });

  // Fetch all PowerBI template reports
  const { data: powerbiReports } = await supabase
    .from('powerbi_reports')
    .select('id, name, description, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <AISettingsPageWrapper
      systemSettings={systemSettings}
      roles={roles || []}
      prompts={prompts || []}
      powerbiReports={powerbiReports || []}
    />
  );
}
