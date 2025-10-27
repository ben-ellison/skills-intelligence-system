'use client';

/**
 * Manual PowerBI Report Management
 *
 * Simple interface to:
 * 1. Add reports from the organization's PowerBI workspace
 * 2. Map reports to modules and roles
 * 3. View and manage existing reports
 */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfigureReportModal from './components/ConfigureReportModal';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  powerbi_workspace_id: string;
  powerbi_workspace_name: string;
}

interface Report {
  id: string;
  powerbi_report_id: string;
  custom_display_name: string;
  powerbi_workspace_id: string;
  created_at: string;
}

export default function OrganizationReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organizationId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [configureReport, setConfigureReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [newReport, setNewReport] = useState({
    powerbiReportId: '',
    powerbiReportName: '',
  });

  // Load organization and reports
  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch organization
      const orgResponse = await fetch(`/api/super-admin/organizations/${organizationId}`);
      if (!orgResponse.ok) throw new Error('Failed to load organization');
      const orgData = await orgResponse.json();
      setOrganization(orgData);

      // Fetch reports
      const reportsResponse = await fetch(
        `/api/super-admin/organizations/${organizationId}/reports`
      );
      if (!reportsResponse.ok) throw new Error('Failed to load reports');
      const reportsData = await reportsResponse.json();
      setReports(reportsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newReport.powerbiReportId.trim() || !newReport.powerbiReportName.trim()) {
      setError('Both Report ID and Report Name are required');
      return;
    }

    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(newReport.powerbiReportId)) {
      setError('Report ID must be a valid GUID');
      return;
    }

    try {
      const response = await fetch(
        `/api/super-admin/organizations/${organizationId}/reports`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            powerbiReportId: newReport.powerbiReportId,
            powerbiReportName: newReport.powerbiReportName,
            powerbiWorkspaceId: organization?.powerbi_workspace_id,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add report');
      }

      setSuccess('Report added successfully!');
      setNewReport({ powerbiReportId: '', powerbiReportName: '' });
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(
        `/api/super-admin/organizations/${organizationId}/reports/${reportId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete report');
      }

      setSuccess('Report deleted successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/super-admin')}
            className="text-slate-600 hover:text-slate-900 mb-4 flex items-center gap-2"
          >
            ← Back to Super Admin
          </button>
          <h1 className="text-3xl font-bold text-slate-900">PowerBI Reports</h1>
          <p className="text-slate-600 mt-2">
            {organization.name} • {organization.powerbi_workspace_name || 'No workspace'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {/* Workspace Info */}
        {organization.powerbi_workspace_id ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">PowerBI Workspace Connected</p>
                <p className="text-blue-700">Workspace: {organization.powerbi_workspace_name}</p>
                <p className="text-blue-600 font-mono text-xs mt-1">{organization.powerbi_workspace_id}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              No PowerBI workspace configured. Please edit the organization to add workspace details.
            </p>
          </div>
        )}

        {/* Reports Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Reports ({reports.length})</h2>
              <p className="text-sm text-slate-600 mt-1">
                Manage PowerBI reports for this organization
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              + Add Report
            </button>
          </div>

          {/* Add Report Form */}
          {showAddForm && (
            <form onSubmit={handleAddReport} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-4">Add New Report</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PowerBI Report ID *
                  </label>
                  <input
                    type="text"
                    value={newReport.powerbiReportId}
                    onChange={e => setNewReport({ ...newReport, powerbiReportId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Find this in the PowerBI report URL after /reports/
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={newReport.powerbiReportName}
                    onChange={e => setNewReport({ ...newReport, powerbiReportName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Skills Coach V1.0 Release"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Human-readable name for this report
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Report
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewReport({ powerbiReportId: '', powerbiReportName: '' });
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Reports List */}
          {reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Report Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Report ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Added</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {report.custom_display_name}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                          {report.powerbi_report_id}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setConfigureReport(report)}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium mb-2">No reports yet</p>
              <p className="text-sm">Click "Add Report" to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Configure Report Modal */}
      {configureReport && (
        <ConfigureReportModal
          organizationId={organizationId}
          reportId={configureReport.id}
          reportName={configureReport.custom_display_name}
          powerbiReportId={configureReport.powerbi_report_id}
          onClose={() => setConfigureReport(null)}
          onSave={() => {
            setSuccess('Report configuration saved successfully!');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />
      )}
    </div>
  );
}
