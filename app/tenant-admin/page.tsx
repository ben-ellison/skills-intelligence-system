import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';

export default async function TenantAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  // Check if user is tenant admin
  if (!session.user?.isTenantAdmin) {
    redirect('/summary');
  }

  // Redirect to users page by default
  redirect('/tenant-admin/users');
}
