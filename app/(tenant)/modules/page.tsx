import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';

export default async function ModulesHomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Welcome to Skills Intelligence System
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Select a module from the navigation above to view your reports
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Getting Started
          </h2>
          <p className="text-blue-800">
            Your available modules appear in the navigation bar. Each module contains
            PowerBI reports tailored to your role and responsibilities.
          </p>
        </div>
      </div>
    </div>
  );
}
