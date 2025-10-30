'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, Eye, EyeOff, Settings, List } from 'lucide-react';

interface GlobalRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GlobalModule {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ModuleTab {
  id: string;
  tab_name: string;
  module_name: string;
  sort_order: number;
  report_id: string;
  workspace_id: string;
  page_name: string | null;
  is_active: boolean;
  global_modules?: {
    display_name: string;
  };
}

interface GlobalRolesPageWrapperProps {
  initialRoles: GlobalRole[];
  globalModules: GlobalModule[];
  moduleTabs: ModuleTab[];
}

export default function GlobalRolesPageWrapper({ initialRoles, globalModules, moduleTabs }: GlobalRolesPageWrapperProps) {
  const [roles, setRoles] = useState<GlobalRole[]>(initialRoles);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<GlobalRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: '',
    sort_order: 0,
    is_active: true,
  });

  // Module permissions state
  const [permissionsRole, setPermissionsRole] = useState<GlobalRole | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Tab permissions state
  const [tabPermissionsRole, setTabPermissionsRole] = useState<GlobalRole | null>(null);
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>([]);
  const [loadingTabPermissions, setLoadingTabPermissions] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/roles');

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      alert('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingRole(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: '',
      sort_order: roles.length > 0 ? Math.max(...roles.map(r => r.sort_order)) + 10 : 10,
      is_active: true,
    });
  };

  const handleEdit = (role: GlobalRole) => {
    setEditingRole(role);
    setIsCreating(false);
    setFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      icon: role.icon || '',
      sort_order: role.sort_order,
      is_active: role.is_active,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingRole(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.display_name) {
        alert('Name and Display Name are required');
        return;
      }

      const url = isCreating 
        ? '/api/super-admin/roles'
        : `/api/super-admin/roles/${editingRole?.id}`;
      
      const method = isCreating ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save role');
      }

      await fetchRoles();
      handleCancel();
      alert(isCreating ? 'Role created successfully' : 'Role updated successfully');
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert(error.message);
    }
  };

  const handleDelete = async (role: GlobalRole) => {
    if (!confirm(`Are you sure you want to delete the role "${role.display_name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/roles/${role.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      await fetchRoles();
      alert('Role deleted successfully');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(error.message);
    }
  };

  const handleMove = async (role: GlobalRole, direction: 'up' | 'down') => {
    const currentIndex = roles.findIndex(r => r.id === role.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === roles.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetRole = roles[targetIndex];

    try {
      // Swap sort_order values
      await Promise.all([
        fetch(`/api/super-admin/roles/${role.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: targetRole.sort_order }),
        }),
        fetch(`/api/super-admin/roles/${targetRole.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: role.sort_order }),
        }),
      ]);

      await fetchRoles();
    } catch (error) {
      console.error('Error reordering roles:', error);
      alert('Failed to reorder roles');
    }
  };

  const handleManagePermissions = async (role: GlobalRole) => {
    setPermissionsRole(role);
    setLoadingPermissions(true);

    try {
      const response = await fetch(`/api/super-admin/roles/${role.id}/modules`);
      if (!response.ok) {
        throw new Error('Failed to load module permissions');
      }

      const data = await response.json();
      setSelectedModuleIds(data.moduleIds || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      alert('Failed to load module permissions');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionsRole) return;

    try {
      setLoadingPermissions(true);
      const response = await fetch(`/api/super-admin/roles/${permissionsRole.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds: selectedModuleIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to save permissions');
      }

      alert('Module permissions updated successfully');
      setPermissionsRole(null);
      setSelectedModuleIds([]);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      alert(error.message);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setSelectedModuleIds(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleClosePermissions = () => {
    setPermissionsRole(null);
    setSelectedModuleIds([]);
  };

  const handleManageTabPermissions = async (role: GlobalRole) => {
    setTabPermissionsRole(role);
    setLoadingTabPermissions(true);

    try {
      const response = await fetch(`/api/super-admin/roles/${role.id}/tabs`);
      if (!response.ok) {
        throw new Error('Failed to load tab permissions');
      }

      const data = await response.json();
      setSelectedTabIds(data.tabIds || []);
    } catch (error) {
      console.error('Error loading tab permissions:', error);
      alert('Failed to load tab permissions');
    } finally {
      setLoadingTabPermissions(false);
    }
  };

  const handleSaveTabPermissions = async () => {
    if (!tabPermissionsRole) return;

    try {
      setLoadingTabPermissions(true);
      const response = await fetch(`/api/super-admin/roles/${tabPermissionsRole.id}/tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabIds: selectedTabIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tab permissions');
      }

      alert('Tab permissions updated successfully');
      setTabPermissionsRole(null);
      setSelectedTabIds([]);
    } catch (error: any) {
      console.error('Error saving tab permissions:', error);
      alert(error.message);
    } finally {
      setLoadingTabPermissions(false);
    }
  };

  const handleToggleTab = (tabId: string) => {
    setSelectedTabIds(prev =>
      prev.includes(tabId)
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );
  };

  const handleCloseTabPermissions = () => {
    setTabPermissionsRole(null);
    setSelectedTabIds([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#033c3a]">Global Roles</h2>
          <p className="text-slate-600 mt-1">
            Manage global roles that can be assigned to users across all organizations
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingRole) && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">
            {isCreating ? 'Create New Role' : 'Edit Role'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name (Unique Identifier) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                placeholder="senior_leader"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use lowercase with underscores (e.g., senior_leader)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                placeholder="Senior Leader"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                rows={2}
                placeholder="Brief description of this role..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Icon (Lucide Icon Name)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                placeholder="Shield"
              />
              <p className="text-xs text-slate-500 mt-1">
                Optional: Lucide icon name (e.g., Shield, User, Crown)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-[#00e5c0] focus:ring-[#00e5c0] border-slate-300 rounded"
                />
                <span className="ml-2 text-sm text-slate-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No roles found. Click "Add Role" to create one.
                </td>
              </tr>
            ) : (
              roles.map((role, index) => (
                <tr key={role.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMove(role, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleMove(role, 'down')}
                        disabled={index === roles.length - 1}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4 text-slate-600" />
                      </button>
                      <span className="text-sm text-slate-500 ml-2">{role.sort_order}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-slate-400 mr-2" />
                      <span className="text-sm font-medium text-slate-900">{role.display_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-600 font-mono">{role.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {role.description || <span className="text-slate-400 italic">No description</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {role.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Eye className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleManagePermissions(role)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Manage module permissions"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleManageTabPermissions(role)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                      title="Manage tab permissions"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(role)}
                      className="text-[#00e5c0] hover:text-[#0eafaa] mr-3"
                      title="Edit role"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <p>
          <strong>Note:</strong> Roles are global and shared across all organizations. They define what permissions
          users have when assigned to them. Roles cannot be deleted if they are currently assigned to any users.
        </p>
      </div>

      {/* Module Permissions Modal */}
      {permissionsRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">
                Module Permissions for {permissionsRole.display_name}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Select which modules this role can access
              </p>
            </div>

            <div className="p-6">
              {loadingPermissions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5c0] mx-auto"></div>
                    <p className="mt-2 text-slate-600">Loading permissions...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {globalModules.map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModuleIds.includes(module.id)}
                        onChange={() => handleToggleModule(module.id)}
                        className="h-5 w-5 text-[#00e5c0] focus:ring-[#00e5c0] border-slate-300 rounded"
                      />
                      <div className="ml-4 flex-1">
                        <div className="font-medium text-slate-900">{module.display_name}</div>
                        {module.description && (
                          <div className="text-sm text-slate-600 mt-1">{module.description}</div>
                        )}
                        <div className="text-xs text-slate-500 mt-1 font-mono">{module.name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={handleSavePermissions}
                disabled={loadingPermissions}
                className="flex items-center px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Permissions
              </button>
              <button
                onClick={handleClosePermissions}
                disabled={loadingPermissions}
                className="flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Permissions Modal */}
      {tabPermissionsRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">
                Tab Permissions for {tabPermissionsRole.display_name}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Select which tabs this role can access within each module
              </p>
            </div>

            <div className="p-6">
              {loadingTabPermissions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5c0] mx-auto"></div>
                    <p className="mt-2 text-slate-600">Loading tab permissions...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group tabs by module */}
                  {Object.entries(
                    moduleTabs.reduce((acc, tab) => {
                      if (!acc[tab.module_name]) {
                        acc[tab.module_name] = [];
                      }
                      acc[tab.module_name].push(tab);
                      return acc;
                    }, {} as Record<string, ModuleTab[]>)
                  ).map(([moduleName, tabs]) => {
                    const moduleDisplayName = tabs[0]?.global_modules?.display_name || moduleName;
                    return (
                      <div key={moduleName} className="border border-slate-200 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-900 mb-3">
                          {moduleDisplayName}
                        </h4>
                        <div className="space-y-2">
                          {tabs.map((tab) => (
                            <label
                              key={tab.id}
                              className="flex items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTabIds.includes(tab.id)}
                                onChange={() => handleToggleTab(tab.id)}
                                className="h-5 w-5 text-[#00e5c0] focus:ring-[#00e5c0] border-slate-300 rounded"
                              />
                              <div className="ml-4 flex-1">
                                <div className="font-medium text-slate-900">{tab.tab_name}</div>
                                {tab.page_name && (
                                  <div className="text-xs text-slate-500 mt-1">Page: {tab.page_name}</div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={handleSaveTabPermissions}
                disabled={loadingTabPermissions}
                className="flex items-center px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Tab Permissions
              </button>
              <button
                onClick={handleCloseTabPermissions}
                disabled={loadingTabPermissions}
                className="flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
