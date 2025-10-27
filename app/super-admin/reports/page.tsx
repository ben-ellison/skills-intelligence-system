import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import ReportsPageWrapper from './page-wrapper';

export default async function PowerBIReportsPage() {
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

  // Fetch all PowerBI reports
  const { data: reports } = await supabase
    .from('powerbi_reports')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return <ReportsPageWrapper initialReports={reports || []} />;
}
