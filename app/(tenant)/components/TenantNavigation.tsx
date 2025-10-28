'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import {
  Home,
  Settings as SettingsIcon,
  Wrench,
  ClipboardCheck,
  FileText,
  TrendingUp,
  FileSpreadsheet,
  BarChart3,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Headphones,
  Bell,
  User,
  LogOut,
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  display_name: string;
  sort_order: number;
  icon?: string;
}

interface ModuleGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  modules: Module[];
  expanded: boolean;
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
  const [groups, setGroups] = useState<ModuleGroup[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>('');
  const pathname = usePathname();

  useEffect(() => {
    fetchModules();
    fetchOrganizationName();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/tenant/modules');
      if (response.ok) {
        const data = await response.json();
        setModules(data);
        organizeModules(data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationName = async () => {
    try {
      const response = await fetch('/api/tenant/organization');
      if (response.ok) {
        const data = await response.json();
        setOrganizationName(data.name || 'Dashboard');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganizationName('Dashboard');
    }
  };

  const organizeModules = (moduleList: Module[]) => {
    const moduleGroups: ModuleGroup[] = [
      {
        id: 'home',
        name: 'Home',
        icon: <Home className="w-5 h-5" />,
        modules: [],
        expanded: true,
      },
      {
        id: 'leadership',
        name: 'Senior Leadership',
        icon: <User className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('senior-leader') ||
          m.display_name.toLowerCase().includes('senior')
        ),
        expanded: true,
      },
      {
        id: 'operations',
        name: 'Operations',
        icon: <Wrench className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('operations') ||
          m.display_name.toLowerCase().includes('operations')
        ),
        expanded: true,
      },
      {
        id: 'quality',
        name: 'Quality & Curriculum',
        icon: <ClipboardCheck className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('quality') ||
          m.name.includes('internal-quality-assurer') ||
          m.name.includes('learning-support-coach') ||
          m.name.includes('skills-coach') ||
          m.display_name.toLowerCase().includes('quality') ||
          m.display_name.toLowerCase().includes('coach')
        ),
        expanded: true,
      },
      {
        id: 'compliance',
        name: 'Compliance',
        icon: <FileText className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('compliance') ||
          m.display_name.toLowerCase().includes('compliance')
        ),
        expanded: true,
      },
      {
        id: 'sales',
        name: 'Sales',
        icon: <TrendingUp className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('sales') ||
          m.display_name.toLowerCase().includes('sales')
        ),
        expanded: true,
      },
      {
        id: 'aaf',
        name: 'Accountability Framework',
        icon: <FileSpreadsheet className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('aaf') ||
          m.display_name.toLowerCase().includes('aaf')
        ),
        expanded: true,
      },
      {
        id: 'qar',
        name: 'QAR Information',
        icon: <BarChart3 className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('qar') ||
          m.display_name.toLowerCase().includes('qar') ||
          m.display_name.toLowerCase().includes('scenarios')
        ),
        expanded: true,
      },
      {
        id: 'funding',
        name: 'Funding Information',
        icon: <BarChart3 className="w-5 h-5" />,
        modules: moduleList.filter(m =>
          m.name.includes('funding') ||
          m.display_name.toLowerCase().includes('funding')
        ),
        expanded: true,
      },
    ];

    // Find modules that haven't been categorized and add them to "Other"
    const categorizedModuleIds = new Set(
      moduleGroups.flatMap(g => g.modules.map(m => m.id))
    );
    const uncategorizedModules = moduleList.filter(m => !categorizedModuleIds.has(m.id));

    if (uncategorizedModules.length > 0) {
      moduleGroups.push({
        id: 'other',
        name: 'Other',
        icon: <SettingsIcon className="w-5 h-5" />,
        modules: uncategorizedModules,
        expanded: true,
      });
    }

    // Filter out empty groups
    setGroups(moduleGroups.filter(g => g.modules.length > 0 || g.id === 'home'));
  };

  const toggleGroup = (groupId: string) => {
    setGroups(groups.map(g =>
      g.id === groupId ? { ...g, expanded: !g.expanded } : g
    ));
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
            <Link href="/modules" className="text-lg font-bold text-[#033c3a]">
              Skills Intelligence System
            </Link>
          ) : (
            <Link href="/modules" className="text-lg font-bold text-[#033c3a]">
              SIS
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              className={`w-5 h-5 text-slate-600 transition-transform ${
                sidebarOpen ? '' : 'rotate-180'
              }`}
            />
          </button>
        </div>

        {/* Module Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="px-4 text-sm text-slate-500">Loading modules...</div>
          ) : (
            <div className="space-y-1 px-2">
              {/* Home Link */}
              <Link
                href="/modules"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/modules'
                    ? 'bg-[#e6ffff] text-[#033c3a]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Home className="w-5 h-5 mr-3" />
                {sidebarOpen && <span>{organizationName || 'Home'}</span>}
              </Link>

              {/* Module Groups */}
              {groups.map((group) => {
                if (group.id === 'home' || group.modules.length === 0) return null;

                // Groups with 2 or fewer modules - not collapsible
                const isSmallGroup = group.modules.length <= 2;

                if (isSmallGroup) {
                  // Single module - direct link
                  if (group.modules.length === 1) {
                    const module = group.modules[0];
                    const isActive = pathname?.startsWith(`/modules/${module.name}`);
                    return (
                      <Link
                        key={group.id}
                        href={`/modules/${module.name}`}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors mt-2 ${
                          isActive
                            ? 'bg-[#e6ffff] text-[#0eafaa]'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {group.icon}
                        {sidebarOpen && <span className="ml-3">{group.name}</span>}
                      </Link>
                    );
                  }

                  // Two modules - show both without collapse
                  return (
                    <div key={group.id} className="mt-2">
                      <div className="flex items-center px-3 py-2 text-sm font-medium text-slate-700">
                        {group.icon}
                        {sidebarOpen && <span className="ml-3">{group.name}</span>}
                      </div>
                      {sidebarOpen && (
                        <div className="ml-4 mt-1 space-y-1">
                          {group.modules.map((module) => {
                            const isActive = pathname?.startsWith(`/modules/${module.name}`);
                            return (
                              <Link
                                key={module.id}
                                href={`/modules/${module.name}`}
                                className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                                  isActive
                                    ? 'bg-[#e6ffff] text-[#0eafaa] font-medium'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                {module.display_name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Multi-module groups (3+) - collapsible
                return (
                  <div key={group.id} className="mt-2">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <div className="flex items-center">
                        {group.icon}
                        {sidebarOpen && <span className="ml-3">{group.name}</span>}
                      </div>
                      {sidebarOpen && (
                        group.expanded ?
                          <ChevronDown className="w-4 h-4" /> :
                          <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {group.expanded && sidebarOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {group.modules.map((module) => {
                          const isActive = pathname?.startsWith(`/modules/${module.name}`);
                          return (
                            <Link
                              key={module.id}
                              href={`/modules/${module.name}`}
                              className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                                isActive
                                  ? 'bg-[#e6ffff] text-[#033c3a] font-medium'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              {module.display_name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-slate-200">
          <Link
            href="/help"
            className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Help & Knowledge Base</span>}
          </Link>
          <Link
            href="/support"
            className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Headphones className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Support</span>}
          </Link>
          <Link
            href="/tenant-admin"
            className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Tenant Admin</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-900">
            {modules.find(m => pathname?.startsWith(`/modules/${m.name}`))?.display_name || organizationName || 'Dashboard'}
          </h1>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 rounded-md hover:bg-slate-100 transition-colors relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#00e5c0] text-[#0a2929] flex items-center justify-center text-sm font-medium">
                  {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {session.user?.name?.split(' ')[0] || 'User'}
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-900">
                      {session.user?.name || session.user?.email}
                    </p>
                    <p className="text-xs text-slate-500">{session.user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="w-4 h-4 mr-3" />
                    Edit Profile
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <SettingsIcon className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  <div className="border-t border-slate-200 my-1"></div>
                  <a
                    href="/api/auth/signout"
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
