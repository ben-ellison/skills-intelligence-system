import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import SettingsPageWrapper from './page-wrapper';

export default async function SuperAdminSettingsPage() {
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

  // Fetch system settings
  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .single();

  // If table doesn't exist, pass null (the UI will show instructions)
  return <SettingsPageWrapper initialSettings={settings} tableExists={!error || error.code !== '42P01'} />;
}
