'use client';

import { useState, useEffect } from 'react';

interface PowerBIReport {
  id: string;
  name: string;
  description: string | null;
  powerbi_report_id: string;
  powerbi_workspace_id: string;
  powerbi_dataset_id: string | null;
  category: string | null;
  version: string | null;
  is_active: boolean;
}

interface ImprovedReportModalProps {
  report: PowerBIReport | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImprovedReportModal({
  report,
  onClose,
  onSuccess,
}: ImprovedReportModalProps) {
  const [formData, setFormData] = useState({
    name: report?.name || '',
    description: report?.description || '',
    powerbiReportId: report?.powerbi_report_id || '',
    powerbiWorkspaceId: report?.powerbi_workspace_id || '',
    powerbiDatasetId: report?.powerbi_dataset_id || '',
    category: report?.category || 'general',
    version: report?.version || '1.0',
    isActive: report?.is_active ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceReports, setWorkspaceReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [masterWorkspaceId, setMasterWorkspaceId] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(!!report); // Show manual entry if editing existing report

  // Load workspace reports on mount
  useEffect(() => {
    loadWorkspaceReports();
  }, []);

  const loadWorkspaceReports = async () => {
    setIsLoadingReports(true);
    setError(null);

    try {
      const response = await fetch('/api/super-admin/reports/scan-master-workspace');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load workspace reports');
      }

      const data = await response.json();
      setWorkspaceReports(data.reports || []);
      setMasterWorkspaceId(data.workspaceId || '');

      // Auto-set workspace ID if not editing
      if (!report && data.workspaceId) {
        setFormData(prev => ({ ...prev, powerbiWorkspaceId: data.workspaceId }));
      }
    } catch (err) {
      console.error('Error loading workspace reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workspace reports');
      setShowManualEntry(true); // Fall back to manual entry
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleReportSelect = (reportId: string) => {
    const selectedReport = workspaceReports.find(r => r.id === reportId);
    if (selectedReport) {
      setFormData(prev => ({
        ...prev,
        name: selectedReport.name,
        powerbiReportId: selectedReport.id,
        powerbiWorkspaceId: masterWorkspaceId,
        powerbiDatasetId: selectedReport.datasetId || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = report
        ? `/api/super-admin/reports/${report.id}`
        : '/api/super-admin/reports';

      const method = report ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save report';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Failed to save report: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving report:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {report ? 'Edit Report' : 'Add New Report'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Mode Toggle */}
          {!report && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <h3 className="font-medium text-blue-900">
                  {showManualEntry ? 'Manual Entry Mode' : 'Workspace Scan Mode'}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {showManualEntry
                    ? 'Enter report details manually'
                    : 'Select report from master workspace'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Switch to {showManualEntry ? 'Scan Mode' : 'Manual Entry'}
              </button>
            </div>
          )}

          {/* Workspace Report Selector (if not manual entry) */}
          {!showManualEntry && !report && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Report from Master Workspace
              </label>
              {isLoadingReports ? (
                <div className="text-center py-4 text-slate-600">Loading reports...</div>
              ) : workspaceReports.length > 0 ? (
                <select
                  onChange={(e) => handleReportSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                >
                  <option value="">-- Select a Report --</option>
                  {workspaceReports.map((report: any) => (
                    <option key={report.id} value={report.id}>
                      {report.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-amber-600 p-3 bg-amber-50 rounded-lg">
                  No reports found in master workspace. Please configure POWERBI_MASTER_WORKSPACE_ID or switch to manual entry.
                </div>
              )}
            </div>
          )}

          {/* Report Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
              placeholder="e.g., Skills Coach V1.0 Release"
              required
              readOnly={!showManualEntry && !report && !formData.name}
            />
            <p className="text-xs text-slate-500 mt-1">
              Use format: [Report Name] V[Version] Release
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
              placeholder="Brief description of what this report shows"
              rows={3}
            />
          </div>

          {/* Category and Version */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                required
              >
                <option value="general">General</option>
                <option value="senior_leader">Senior Leader</option>
                <option value="operations">Operations</option>
                <option value="quality">Quality</option>
                <option value="sales">Sales</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                placeholder="1.0"
              />
            </div>
          </div>

          {/* Manual Entry Fields */}
          {(showManualEntry || report) && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PowerBI Report ID (GUID) *
                </label>
                <input
                  type="text"
                  value={formData.powerbiReportId}
                  onChange={(e) => setFormData({ ...formData, powerbiReportId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono text-sm"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PowerBI Workspace ID (GUID) *
                </label>
                <input
                  type="text"
                  value={formData.powerbiWorkspaceId}
                  onChange={(e) => setFormData({ ...formData, powerbiWorkspaceId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono text-sm"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PowerBI Dataset ID (GUID)
                </label>
                <input
                  type="text"
                  value={formData.powerbiDatasetId}
                  onChange={(e) => setFormData({ ...formData, powerbiDatasetId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono text-sm"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (optional)"
                />
              </div>
            </>
          )}

          {/* Active Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2 text-[#00e5c0] focus:ring-[#00e5c0]"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              Report is active and available for assignment
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : report ? 'Update Report' : 'Add Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
