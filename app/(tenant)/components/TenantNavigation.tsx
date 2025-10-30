'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import * as Icons from 'lucide-react';
import {
  Home,
  Settings as SettingsIcon,
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
  icon_name: string | null;
  module_group: string | null;
  sort_order: number;
  is_active: boolean;
  source: string;
}

interface ModuleGroup {
  id: string;
  name: string;
  modules: Module[];
  expanded: boolean;
}

const getGroupLabel = (groupId: string): string => {
  const labels: Record<string, string> = {
    core: 'Core Modules',
    analysis: 'Analysis & Reporting',
    admin: 'Administration',
  };
  return labels[groupId] || groupId;
};

const getIconComponent = (iconName: string | null) => {
  if (!iconName) return <SettingsIcon className="w-5 h-5" />;
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent className="w-5 h-5" /> : <SettingsIcon className="w-5 h-5" />;
};

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
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
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
        setOrganizationLogo(data.logo_url || null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganizationName('Dashboard');
    }
  };

  const organizeModules = (moduleList: Module[]) => {
    // Group modules by their module_group
    const groupedByCategory: Record<string, Module[]> = {};

    moduleList.forEach(module => {
      const group = module.module_group || 'other';
      if (!groupedByCategory[group]) {
        groupedByCategory[group] = [];
      }
      groupedByCategory[group].push(module);
    });

    // Sort modules within each group by sort_order
    Object.keys(groupedByCategory).forEach(group => {
      groupedByCategory[group].sort((a, b) => a.sort_order - b.sort_order);
    });

    // Create ModuleGroup array in desired order
    const groupOrder = ['core', 'analysis', 'admin', 'other'];
    const moduleGroups: ModuleGroup[] = groupOrder
      .filter(groupId => groupedByCategory[groupId]?.length > 0)
      .map(groupId => ({
        id: groupId,
        name: getGroupLabel(groupId),
        modules: groupedByCategory[groupId],
        expanded: true,
      }));

    // Add any groups not in the predefined order
    Object.keys(groupedByCategory).forEach(groupId => {
      if (!groupOrder.includes(groupId)) {
        moduleGroups.push({
          id: groupId,
          name: getGroupLabel(groupId),
          modules: groupedByCategory[groupId],
          expanded: true,
        });
      }
    });

    setGroups(moduleGroups);
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
        } bg-[#e6ffff] border-r border-[#0eafaa] transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#0eafaa]">
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
            className="p-2 rounded-md hover:bg-[#00f9e3]/20 transition-colors"
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
              {/* Summary and Priorities Link */}
              <Link
                href="/summary"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/summary'
                    ? 'bg-[#00e5c0] text-[#033c3a] shadow-sm'
                    : 'text-[#033c3a] hover:bg-[#00f9e3]/20'
                }`}
              >
                <Home className="w-5 h-5 mr-3" />
                {sidebarOpen && <span>Summary and Priorities</span>}
              </Link>

              {/* Module Groups */}
              {groups.map((group) => {
                return (
                  <div key={group.id} className="mt-4">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#033c3a]/60 uppercase tracking-wider hover:bg-[#00f9e3]/10 rounded-md transition-colors"
                    >
                      {sidebarOpen && <span>{group.name}</span>}
                      {sidebarOpen && (
                        group.expanded ?
                          <ChevronDown className="w-4 h-4" /> :
                          <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {/* Group Modules */}
                    {group.expanded && (
                      <div className="mt-1 space-y-1">
                        {group.modules.map((module) => {
                          const isActive = pathname?.startsWith(`/modules/${module.name}`);
                          return (
                            <Link
                              key={module.id}
                              href={`/modules/${module.name}`}
                              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                isActive
                                  ? 'bg-[#00e5c0] text-[#033c3a] shadow-sm'
                                  : 'text-[#033c3a] hover:bg-[#00f9e3]/20'
                              }`}
                              title={sidebarOpen ? undefined : module.display_name}
                            >
                              {getIconComponent(module.icon_name)}
                              {sidebarOpen && <span className="ml-3">{module.display_name}</span>}
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
        <div className="border-t border-[#0eafaa]">
          <Link
            href="/help"
            className="flex items-center px-4 py-3 text-sm text-[#033c3a] hover:bg-[#00f9e3]/20 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Help & Knowledge Base</span>}
          </Link>
          <Link
            href="/support"
            className="flex items-center px-4 py-3 text-sm text-[#033c3a] hover:bg-[#00f9e3]/20 transition-colors"
          >
            <Headphones className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Support</span>}
          </Link>
          <Link
            href="/tenant-admin"
            className="flex items-center px-4 py-3 text-sm text-[#033c3a] hover:bg-[#00f9e3]/20 transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3">Tenant Admin</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-[#e6ffff] border-b border-[#0eafaa] flex items-center justify-between px-6">
          <div className="flex items-center">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt={organizationName}
                className="h-8 w-auto max-w-[200px] object-contain bg-[#033c3a] px-3 py-1 rounded"
              />
            ) : (
              <h1 className="text-xl font-semibold text-slate-900">
                {organizationName || 'Dashboard'}
              </h1>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 rounded-md hover:bg-[#00f9e3]/20 transition-colors relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-[#00f9e3]/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#00e5c0] text-[#0a2929] flex items-center justify-center text-sm font-medium">
                  {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {session.user?.name?.split(' ')[0] || 'User'}
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#0eafaa] py-1 z-50">
                  <div className="px-4 py-3 border-b border-[#0eafaa]/30">
                    <p className="text-sm font-medium text-slate-900">
                      {session.user?.name || session.user?.email}
                    </p>
                    <p className="text-xs text-slate-500">{session.user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-[#033c3a] hover:bg-[#00f9e3]/20"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="w-4 h-4 mr-3" />
                    Edit Profile
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="flex items-center px-4 py-2 text-sm text-[#033c3a] hover:bg-[#00f9e3]/20"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <SettingsIcon className="w-4 h-4 mr-3" />
                    Settings
                  </Link>
                  <div className="border-t border-[#0eafaa]/30 my-1"></div>
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
