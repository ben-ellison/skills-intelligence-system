import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
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

  // Super admins can access tenant modules for testing/support purposes
  // They have access to both tenant modules and super-admin portal

  return (
    <TenantNavigation session={session}>
      {children}
    </TenantNavigation>
  );
}
