import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createAdminClient } from '@/lib/supabase/server';
import SuperAdminPageWrapper from './page-wrapper';

export default async function SuperAdminPage() {
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

  // Fetch all organizations
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch all users
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      organizations (
        name,
        subdomain
      )
    `)
    .order('created_at', { ascending: false });

  // Fetch all subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      organizations (
        name,
        subdomain
      ),
      pricing_tiers (
        name,
        price_per_learner
      )
    `)
    .order('created_at', { ascending: false});

  // Fetch integration providers
  const { data: integrationProviders } = await supabase
    .from('integration_providers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <SuperAdminPageWrapper
      initialData={{
        organizations: organizations || [],
        users: users || [],
        subscriptions: subscriptions || [],
        integrationProviders: integrationProviders || [],
      }}
    />
  );
}
