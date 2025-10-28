'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import CreateTabModal from './components/CreateTabModal';
import EditTabModal from './components/EditTabModal';

interface ModuleTab {
  id: string;
  module_name: string;
  tab_name: string;
  sort_order: number;
  report_id: string;
  page_name: string | null;
  is_active: boolean;
  created_at: string;
  report: {
    id: string;
    name: string;
    display_name: string;
  };
}

interface Report {
  id: string;
  name: string;
  display_name: string;
}

interface ModuleTabsData {
  moduleTabs: ModuleTab[];
  reports: Report[];
}

// Known module names - these should match the module names in organization_modules
const MODULE_NAMES = [
  { value: 'senior-leader', label: 'Senior Leadership' },
  { value: 'operations', label: 'Operations' },
  { value: 'quality', label: 'Quality & Curriculum' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'sales', label: 'Sales' },
  { value: 'aaf', label: 'Accountability Framework' },
  { value: 'qar', label: 'QAR Information' },
  { value: 'funding', label: 'Funding Information' },
];

export default function ModuleTabsPageWrapper({ initialData }: { initialData: ModuleTabsData }) {
  const [data, setData] = useState<ModuleTabsData>(initialData);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ModuleTab | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('all');

  const handleEditTab = (tab: ModuleTab) => {
    setSelectedTab(tab);
    setIsEditModalOpen(true);
  };

  const handleDeleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this tab? This will affect all tenants.')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/module-tabs/${tabId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tab');
      }

      // Refresh data
      setData({
        ...data,
        moduleTabs: data.moduleTabs.filter(t => t.id !== tabId),
      });
    } catch (error) {
      console.error('Error deleting tab:', error);
      alert('Failed to delete tab');
    }
  };

  const handleTabCreated = (newTab: ModuleTab) => {
    setData({
      ...data,
      moduleTabs: [...data.moduleTabs, newTab].sort((a, b) => {
        if (a.module_name !== b.module_name) {
          return a.module_name.localeCompare(b.module_name);
        }
        return a.sort_order - b.sort_order;
      }),
    });
  };

  const handleTabUpdated = (updatedTab: ModuleTab) => {
    setData({
      ...data,
      moduleTabs: data.moduleTabs.map(t => t.id === updatedTab.id ? updatedTab : t)
        .sort((a, b) => {
          if (a.module_name !== b.module_name) {
            return a.module_name.localeCompare(b.module_name);
          }
          return a.sort_order - b.sort_order;
        }),
    });
  };

  // Group tabs by module
  const tabsByModule = data.moduleTabs.reduce((acc, tab) => {
    if (!acc[tab.module_name]) {
      acc[tab.module_name] = [];
    }
    acc[tab.module_name].push(tab);
    return acc;
  }, {} as Record<string, ModuleTab[]>);

  // Filter by selected module
  const filteredModules = selectedModule === 'all'
    ? Object.keys(tabsByModule)
    : [selectedModule];

  const getModuleLabel = (moduleName: string) => {
    return MODULE_NAMES.find(m => m.value === moduleName)?.label || moduleName;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/super-admin"
            className="inline-flex items-center text-sm text-[#033c3a] hover:text-[#00e5c0] mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Super Admin
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#033c3a]">Module Tabs Configuration</h1>
              <p className="mt-2 text-[#033c3a]/70">
                Configure which tabs appear in each module for all tenants
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Tab
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-6">
            <div className="text-sm font-medium text-[#033c3a]/70">Total Tabs</div>
            <div className="mt-2 text-3xl font-bold text-[#033c3a]">{data.moduleTabs.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-6">
            <div className="text-sm font-medium text-[#033c3a]/70">Modules Configured</div>
            <div className="mt-2 text-3xl font-bold text-[#033c3a]">{Object.keys(tabsByModule).length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-6">
            <div className="text-sm font-medium text-[#033c3a]/70">Available Reports</div>
            <div className="mt-2 text-3xl font-bold text-[#033c3a]">{data.reports.length}</div>
          </div>
        </div>

        {/* Module Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#033c3a] mb-2">
            Filter by Module
          </label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
          >
            <option value="all">All Modules</option>
            {MODULE_NAMES.map(module => (
              <option key={module.value} value={module.value}>
                {module.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs by Module */}
        <div className="space-y-8">
          {filteredModules.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-12 text-center">
              <p className="text-[#033c3a]/70">No tabs configured yet. Click "Add Tab" to get started.</p>
            </div>
          ) : (
            filteredModules.map(moduleName => (
              <div key={moduleName} className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 overflow-hidden">
                <div className="bg-[#e6ffff] border-b border-[#0eafaa]/20 px-6 py-4">
                  <h2 className="text-xl font-semibold text-[#033c3a]">
                    {getModuleLabel(moduleName)}
                  </h2>
                  <p className="text-sm text-[#033c3a]/70 mt-1">
                    {tabsByModule[moduleName].length} tab{tabsByModule[moduleName].length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="divide-y divide-[#0eafaa]/10">
                  {tabsByModule[moduleName].map((tab, index) => (
                    <div
                      key={tab.id}
                      className="px-6 py-4 hover:bg-[#e6ffff]/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="text-[#033c3a]/40">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#00e5c0]/20 text-[#033c3a] text-sm font-medium">
                              {tab.sort_order}
                            </span>
                            <div>
                              <h3 className="text-lg font-medium text-[#033c3a]">{tab.tab_name}</h3>
                              <p className="text-sm text-[#033c3a]/70">
                                Report: {tab.report.display_name}
                                {tab.page_name && ` • Page: ${tab.page_name}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tab.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tab.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTab(tab)}
                          className="p-2 text-[#033c3a] hover:bg-[#00e5c0]/20 rounded-lg transition-colors"
                          title="Edit tab"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTab(tab.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete tab"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateTabModal
          reports={data.reports}
          onClose={() => setIsCreateModalOpen(false)}
          onTabCreated={handleTabCreated}
        />
      )}

      {isEditModalOpen && selectedTab && (
        <EditTabModal
          tab={selectedTab}
          reports={data.reports}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTab(null);
          }}
          onTabUpdated={handleTabUpdated}
        />
      )}
    </div>
  );
}
