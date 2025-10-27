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

export default function TenantNavigation({
  session,
  children
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {sidebarOpen ? (
            <Link href="/modules" className="text-lg font-bold text-purple-600">
              Skills Intelligence
            </Link>
          ) : (
            <Link href="/modules" className="text-lg font-bold text-purple-600">
              SI
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg
              className={`w-5 h-5 text-slate-600 transition-transform ${
                sidebarOpen ? '' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Module Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="px-4 text-sm text-slate-500">Loading modules...</div>
          ) : modules.length === 0 ? (
            <div className="px-4 text-sm text-slate-500">No modules available</div>
          ) : (
            <div className="space-y-1 px-2">
              {modules.map((module) => {
                const isActive = pathname?.startsWith(`/modules/${module.name}`);
                return (
                  <Link
                    key={module.id}
                    href={`/modules/${module.name}`}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    title={module.display_name}
                  >
                    {sidebarOpen ? (
                      module.display_name
                    ) : (
                      <span className="text-xs">{module.display_name.substring(0, 2)}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Menu at Bottom */}
        <div className="border-t border-slate-200 p-4">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900 truncate">
                {session.user?.name || session.user?.email}
              </div>
              <a
                href="/api/auth/signout"
                className="block text-sm text-slate-600 hover:text-slate-900"
              >
                Sign Out
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-medium">
                {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
              </div>
              <a
                href="/api/auth/signout"
                className="text-xs text-slate-600 hover:text-slate-900"
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <h1 className="text-xl font-semibold text-slate-900">
            {modules.find(m => pathname?.startsWith(`/modules/${m.name}`))?.display_name || 'Dashboard'}
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
