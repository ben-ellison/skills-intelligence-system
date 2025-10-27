import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

  // Super admins should use super-admin portal
  if (session.user?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Super Admin Access</h1>
          <p className="text-slate-600 mb-6">
            You're logged in as a Super Admin. Please use the Super Admin portal.
          </p>
          <a
            href="/super-admin"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-block"
          >
            Go to Super Admin Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TenantNavigation session={session} />
      <main>{children}</main>
    </div>
  );
}
