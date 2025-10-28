'use client';

import { useState } from 'react';
import Link from 'next/link';

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
  provider_code?: string | null;
  lms_code?: string | null;
  english_maths_code?: string | null;
  crm_code?: string | null;
  hr_code?: string | null;
  role_name?: string | null;
  report_version?: string | null;
  is_template?: boolean;
  created_at: string;
  updated_at: string;
}

interface ReportsPageWrapperProps {
  initialReports: PowerBIReport[];
}

export default function ReportsPageWrapper({ initialReports }: ReportsPageWrapperProps) {
  const [reports, setReports] = useState<PowerBIReport[]>(initialReports);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<PowerBIReport | null>(null);

  const categoryColors: Record<string, string> = {
    'senior_leader': 'bg-[#e6ffff] text-[#0eafaa]',
    'operations': 'bg-blue-100 text-blue-700',
    'quality': 'bg-green-100 text-green-700',
    'sales': 'bg-orange-100 text-orange-700',
    'general': 'bg-slate-100 text-slate-700',
  };

  const handleAddReport = () => {
    setEditingReport(null);
    setIsModalOpen(true);
  };

  const handleEditReport = (report: PowerBIReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const refreshReports = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                PowerBI Reports Library
              </h1>
              <p className="text-slate-600">
                Manage PowerBI reports that will be assigned to roles
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/super-admin"
                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back to Portal
              </Link>
              <button
                onClick={handleAddReport}
                className="px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
              >
                + Add Report
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Reports</h2>

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Reports Yet</h3>
                <p className="text-slate-600 mb-6">
                  Add your first PowerBI report to get started
                </p>
                <button
                  onClick={handleAddReport}
                  className="px-6 py-3 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
                >
                  + Add Your First Report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Provider Code</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-slate-500 mt-1">{report.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.provider_code ? (
                            <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold">
                              {report.provider_code}
                            </code>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Universal</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.category && (
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              categoryColors[report.category] || categoryColors.general
                            }`}>
                              {report.category.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.is_active ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleEditReport(report)}
                            className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                          >
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <ReportModal
            report={editingReport}
            onClose={() => setIsModalOpen(false)}
            onSuccess={refreshReports}
          />
        )}
      </div>
    </div>
  );
}

function ReportModal({
  report,
  onClose,
  onSuccess,
}: {
  report: PowerBIReport | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save report');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {report ? 'Edit Report' : 'Add New Report'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
              placeholder="e.g., APTEM-BKSB-HUBSPOT - Operations Leader v1.2"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Use format: [LMS]-[E&M]-[CRM] - [Role Name] v[Version]
              <br />
              Examples: APTEM-BKSB-HUBSPOT - Operations Leader v1.2, ONEFILE - Dashboard v1.0
            </p>
          </div>

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
            <p className="text-xs text-slate-500 mt-1">
              Find this in PowerBI Service → Report → File → Embed Report
            </p>
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
            <p className="text-xs text-slate-500 mt-1">
              Find this in PowerBI Service → Workspace settings → URL
            </p>
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
