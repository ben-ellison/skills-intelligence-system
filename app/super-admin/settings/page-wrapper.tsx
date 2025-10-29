'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SystemSettings {
  id: string;
  powerbi_master_workspace_id: string | null;
  powerbi_master_workspace_name: string | null;
  created_at: string;
  updated_at: string;
}

interface SettingsPageWrapperProps {
  initialSettings: SystemSettings | null;
  tableExists: boolean;
}

export default function SettingsPageWrapper({ initialSettings, tableExists }: SettingsPageWrapperProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    powerbiMasterWorkspaceId: initialSettings?.powerbi_master_workspace_id || '',
    powerbiMasterWorkspaceName: initialSettings?.powerbi_master_workspace_name || '',
  });

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully!');
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      powerbiMasterWorkspaceId: initialSettings?.powerbi_master_workspace_id || '',
      powerbiMasterWorkspaceName: initialSettings?.powerbi_master_workspace_name || '',
    });
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/super-admin" className="hover:text-slate-900">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">System Settings</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            System Settings
          </h1>
          <p className="text-slate-600">
            Configure global system settings and PowerBI integration
          </p>
        </div>

        {/* Migration Required Warning */}
        {!tableExists && (
          <div className="mb-6 bg-amber-50 border border-amber-500 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Database Migration Required</h3>
                <p className="text-sm text-amber-800 mb-3">
                  The system_settings table needs to be created in your database. Please run the following SQL in your Supabase SQL Editor:
                </p>
                <div className="bg-amber-100 border border-amber-300 rounded p-3 font-mono text-xs overflow-x-auto">
                  <pre className="text-amber-900">{`CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  powerbi_master_workspace_id TEXT,
  powerbi_master_workspace_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to system_settings"
  ON system_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO system_settings (powerbi_master_workspace_id, powerbi_master_workspace_name)
VALUES (null, null);`}</pre>
                </div>
                <p className="text-sm text-amber-800 mt-3">
                  After running this SQL, refresh this page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* PowerBI Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                PowerBI Master Workspace
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Configure the master workspace where template reports are stored
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
              >
                Edit Settings
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Master Workspace ID (GUID)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.powerbiMasterWorkspaceId}
                  onChange={(e) => setFormData({ ...formData, powerbiMasterWorkspaceId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono text-sm"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              ) : (
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700">
                  {formData.powerbiMasterWorkspaceId || (
                    <span className="text-slate-400 italic">Not configured</span>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Find this in PowerBI Service → Workspace settings → URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Master Workspace Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.powerbiMasterWorkspaceName}
                  onChange={(e) => setFormData({ ...formData, powerbiMasterWorkspaceName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="e.g., Master Reports Workspace"
                />
              ) : (
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                  {formData.powerbiMasterWorkspaceName || (
                    <span className="text-slate-400 italic">Not configured</span>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Friendly name for the master workspace (optional)
              </p>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">About Master Workspace</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>The master workspace contains all your template PowerBI reports that can be deployed to individual organizations.</p>
                <p>When you add a new report to the PowerBI Reports Library, the system will scan this workspace to let you select reports from a dropdown instead of manually entering GUIDs.</p>
                <p>Make sure the service principal has access to this workspace in PowerBI.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
