'use client';

import { useState, useEffect } from 'react';

interface Module {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
  is_active: boolean;
}

interface ConfigureReportModalProps {
  organizationId: string;
  reportId: string;
  reportName: string;
  powerbiReportId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ConfigureReportModal({
  organizationId,
  reportId,
  reportName,
  powerbiReportId,
  onClose,
  onSave,
}: ConfigureReportModalProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch modules for this organization
      const modulesRes = await fetch(`/api/super-admin/organizations/${organizationId}/modules`);
      const modulesData = await modulesRes.json();

      // Fetch all roles
      const rolesRes = await fetch('/api/super-admin/roles');
      const rolesData = await rolesRes.json();

      // Fetch current configuration for this report
      const configRes = await fetch(
        `/api/super-admin/organizations/${organizationId}/reports/${reportId}/config`
      );
      const configData = await configRes.json();

      setModules(modulesData.filter((m: Module) => m.is_active));
      setRoles(rolesData.filter((r: Role) => r.is_active));

      // Pre-select existing mappings
      console.log('Config data received:', configData);
      if (configData.modules && configData.modules.length > 0) {
        const moduleIds = configData.modules.map((m: any) => m.module_id);
        console.log('Setting selected modules:', moduleIds);
        setSelectedModules(moduleIds);
      }
      if (configData.roles && configData.roles.length > 0) {
        const roleIds = configData.roles.map((r: any) => r.role_id);
        console.log('Setting selected roles:', roleIds);
        setSelectedRoles(roleIds);
      }
    } catch (err) {
      console.error('Error fetching configuration data:', err);
      setError('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch(
        `/api/super-admin/organizations/${organizationId}/reports/${reportId}/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modules: selectedModules,
            roles: selectedRoles,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Configure Report
              </h2>
              <p className="text-sm text-gray-600 mt-1">{reportName}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                {powerbiReportId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading configuration...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Modules Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Assign to Modules
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select which modules should have access to this report. Users will see
                  this report when navigating to the selected modules.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modules.map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModules.includes(module.id)}
                        onChange={() => toggleModule(module.id)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">
                          {module.display_name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({module.name})
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {modules.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No modules available for this organization
                  </p>
                )}
              </div>

              {/* Roles Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Assign to Roles
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select which roles can access this report. Only users with the selected
                  roles will be able to view this report.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">
                          {role.display_name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          (Level {role.level})
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
