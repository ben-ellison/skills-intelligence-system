'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import CreateModuleModal from './components/CreateModuleModal';
import EditModuleModal from './components/EditModuleModal';

interface GlobalModule {
  id: string;
  name: string;
  display_name: string;
  icon_name: string | null;
  module_group: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface GlobalModulesData {
  initialModules: GlobalModule[];
}

export default function GlobalModulesPageWrapper({ initialModules }: GlobalModulesData) {
  const [modules, setModules] = useState<GlobalModule[]>(initialModules);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<GlobalModule | null>(null);

  const handleEditModule = (module: GlobalModule) => {
    setSelectedModule(module);
    setIsEditModalOpen(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? This will affect all tenants that use it.')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/global-modules/${moduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete module');
      }

      // Refresh data
      setModules(modules.filter(m => m.id !== moduleId));
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module');
    }
  };

  const handleModuleCreated = (newModule: GlobalModule) => {
    setModules([...modules, newModule].sort((a, b) => a.sort_order - b.sort_order));
  };

  const handleModuleUpdated = (updatedModule: GlobalModule) => {
    setModules(modules.map(m => m.id === updatedModule.id ? updatedModule : m)
      .sort((a, b) => a.sort_order - b.sort_order));
  };

  // Group modules by module_group
  const groupedModules = modules.reduce((acc, module) => {
    const group = module.module_group || 'ungrouped';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(module);
    return acc;
  }, {} as Record<string, GlobalModule[]>);

  const getGroupLabel = (groupName: string) => {
    const labels: Record<string, string> = {
      core: 'Core Modules',
      analysis: 'Analysis & Reporting',
      admin: 'Administration',
      ungrouped: 'Other Modules',
    };
    return labels[groupName] || groupName;
  };

  const activeModules = modules.filter(m => m.is_active).length;
  const inactiveModules = modules.filter(m => !m.is_active).length;

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
              <h1 className="text-3xl font-bold text-[#033c3a]">Global Modules Configuration</h1>
              <p className="mt-2 text-[#033c3a]/70">
                Configure which modules appear in the sidebar for all tenants
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Module
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-6">
            <div className="text-sm font-medium text-[#033c3a]/70">Total Modules</div>
            <div className="mt-2 text-3xl font-bold text-[#033c3a]">{modules.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-6">
            <div className="text-sm font-medium text-[#033c3a]/70">Active</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{activeModules}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-6">
            <div className="text-sm font-medium text-[#033c3a]/70">Inactive</div>
            <div className="mt-2 text-3xl font-bold text-gray-600">{inactiveModules}</div>
          </div>
        </div>

        {/* Modules Grouped */}
        <div className="space-y-8">
          {Object.keys(groupedModules).length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 p-12 text-center">
              <p className="text-[#033c3a]/70">No modules configured yet. Click "Add Module" to get started.</p>
            </div>
          ) : (
            Object.entries(groupedModules).map(([groupName, groupModules]) => (
              <div key={groupName} className="bg-white rounded-lg shadow-sm border border-[#0eafaa]/20 overflow-hidden">
                <div className="bg-[#e6ffff] border-b border-[#0eafaa]/20 px-6 py-4">
                  <h2 className="text-xl font-semibold text-[#033c3a]">
                    {getGroupLabel(groupName)}
                  </h2>
                  <p className="text-sm text-[#033c3a]/70 mt-1">
                    {groupModules.length} module{groupModules.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="divide-y divide-[#0eafaa]/10">
                  {groupModules.map((module) => (
                    <div
                      key={module.id}
                      className="px-6 py-4 hover:bg-[#e6ffff]/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="text-[#033c3a]/40">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#00e5c0]/20 text-[#033c3a] text-sm font-medium">
                              {module.sort_order}
                            </span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-medium text-[#033c3a]">{module.display_name}</h3>
                                {module.icon_name && (
                                  <span className="text-xs text-[#033c3a]/50 font-mono">
                                    ({module.icon_name})
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#033c3a]/70">
                                ID: {module.name}
                                {module.description && ` • ${module.description}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            module.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {module.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditModule(module)}
                          className="p-2 text-[#033c3a] hover:bg-[#00e5c0]/20 rounded-lg transition-colors"
                          title="Edit module"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete module"
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
        <CreateModuleModal
          onClose={() => setIsCreateModalOpen(false)}
          onModuleCreated={handleModuleCreated}
        />
      )}

      {isEditModalOpen && selectedModule && (
        <EditModuleModal
          module={selectedModule}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedModule(null);
          }}
          onModuleUpdated={handleModuleUpdated}
        />
      )}
    </div>
  );
}
