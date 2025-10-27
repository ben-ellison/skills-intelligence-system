import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  const isSuperAdmin = session.user?.isSuperAdmin || false;
  const isTenantAdmin = session.user?.isTenantAdmin || false;

  // Redirect super admins to super-admin portal
  if (isSuperAdmin) {
    redirect('/super-admin');
  }

  // Redirect regular users and tenant admins to tenant modules
  redirect('/modules');

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">
            Welcome to Skills Intelligence System
          </h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Authentication Successful!
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Auth0 login is working perfectly!
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Your Session
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-slate-700">
                <span className="font-semibold">Email:</span> {session.user?.email}
              </p>
              <p className="text-slate-700">
                <span className="font-semibold">Name:</span> {session.user?.name}
              </p>
              <p className="text-slate-700">
                <span className="font-semibold">Role:</span>{' '}
                {isSuperAdmin && <span className="text-purple-600 font-semibold">Super Admin</span>}
                {!isSuperAdmin && isTenantAdmin && <span className="text-blue-600 font-semibold">Tenant Admin</span>}
                {!isSuperAdmin && !isTenantAdmin && <span className="text-slate-600">User</span>}
              </p>
              {session.user?.image && (
                <p className="text-slate-700">
                  <span className="font-semibold">Avatar:</span>
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="inline-block w-10 h-10 rounded-full ml-2"
                  />
                </p>
              )}
            </div>
          </div>

          {isSuperAdmin && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Super Admin Access
              </h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800 mb-4">
                  You have full platform access as a Super Admin
                </p>
                <Link
                  href="/super-admin"
                  className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Open Super Admin Portal
                </Link>
              </div>
            </div>
          )}

          {isTenantAdmin && !isSuperAdmin && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Tenant Admin Access
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 mb-4">
                  You can manage your organization
                </p>
                <Link
                  href="/tenant-admin"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open Tenant Admin Portal
                </Link>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              System Status
            </h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li className="text-green-600">✓ Auth0 authentication configured</li>
              <li className="text-green-600">✓ Database schema deployed in Supabase</li>
              <li className="text-green-600">✓ User sync to database working</li>
              <li className="text-green-600">✓ Role-based access control ready</li>
              <li className="text-slate-500">○ PowerBI integration pending</li>
              <li className="text-slate-500">○ AI features pending</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <a
              href="/api/auth/signout"
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Sign Out
            </a>
            <a
              href="/test-db"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Database Test
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
