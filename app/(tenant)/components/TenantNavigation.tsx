'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';

interface Module {
  id: string;
  name: string;
  display_name: string;
  sort_order: number;
  icon?: string;
}

export default function TenantNavigation({ session }: { session: Session }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/tenant/modules');
      if (response.ok) {
        const data = await response.json();
        setModules(data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/modules" className="text-xl font-bold text-purple-600">
                Skills Intelligence
              </Link>
            </div>

            {/* Module Navigation */}
            {!loading && modules.length > 0 && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                {modules.map((module) => {
                  const isActive = pathname?.startsWith(`/modules/${module.name}`);
                  return (
                    <Link
                      key={module.id}
                      href={`/modules/${module.name}`}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {module.display_name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {session.user?.name || session.user?.email}
              </span>
              <a
                href="/api/auth/signout"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Module Navigation */}
      {!loading && modules.length > 0 && (
        <div className="sm:hidden border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {modules.map((module) => {
              const isActive = pathname?.startsWith(`/modules/${module.name}`);
              return (
                <Link
                  key={module.id}
                  href={`/modules/${module.name}`}
                  className={`block px-3 py-2 text-base font-medium rounded-md ${
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {module.display_name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
