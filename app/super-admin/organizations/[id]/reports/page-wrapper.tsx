'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  powerbi_workspace_id: string | null;
  powerbi_workspace_name: string | null;
}

interface TemplateReport {
  id: string;
  name: string;
  description: string | null;
  powerbi_report_id: string;
  powerbi_workspace_id: string;
  category: string | null;
  is_active: boolean;
}

interface DeployedReport {
  id: string;
  template_report_id: string;
  powerbi_report_id: string;
  powerbi_workspace_id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  deployment_status: string;
  deployment_error: string | null;
  deployed_at: string | null;
  deployed_by: string | null;
  created_at: string;
}

interface ManageReportsProps {
  organization: Organization;
  templateReports: TemplateReport[];
  deployedReports: DeployedReport[];
}

export default function ManageReportsWrapper({
  organization,
  templateReports,
  deployedReports,
}: ManageReportsProps) {
  const router = useRouter();
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for deployment
  const [deploymentForm, setDeploymentForm] = useState({
    powerbiReportId: '',
    displayName: '',
  });

  // Get deployed template IDs for quick lookup
  const deployedTemplateIds = new Set(deployedReports.map(r => r.template_report_id));

  const handleDeployReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateReportId: selectedTemplate.id,
          powerbiReportId: deploymentForm.powerbiReportId,
          powerbiWorkspaceId: organization.powerbi_workspace_id,
          displayName: deploymentForm.displayName || selectedTemplate.name,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deploy report');
      }

      setSuccess('Report deployed successfully!');
      setIsDeployModalOpen(false);
      setSelectedTemplate(null);
      setDeploymentForm({ powerbiReportId: '', displayName: '' });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to archive this report deployment?')) return;

    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deployment_status: 'archived' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive report');
      }

      setSuccess('Report archived successfully!');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link href="/super-admin" className="hover:text-slate-900">
              Super Admin
            </Link>
            <span>/</span>
            <Link href={`/super-admin/organizations/${organization.id}`} className="hover:text-slate-900">
              {organization.name}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Report Deployments</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Report Deployments</h1>
              <p className="text-slate-600 mt-2">
                Deploy template reports to {organization.name}'s PowerBI workspace
              </p>
            </div>
            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
              disabled={!organization.powerbi_workspace_id}
            >
              + Deploy Report
            </button>
          </div>
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

        {/* Workspace Warning */}
        {!organization.powerbi_workspace_id && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-yellow-900 mb-1">No PowerBI Workspace Configured</p>
                <p className="text-yellow-800 text-sm">
                  Configure the organization's PowerBI workspace in the Overview tab before deploying reports.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deployed Reports Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Deployed Reports ({deployedReports.length})</h2>

          {deployedReports.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-slate-700 mb-2">No Reports Deployed Yet</p>
              <p className="text-slate-600">Deploy template reports to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Report Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Deployed</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">PowerBI Report ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deployedReports.map((report) => (
                    <tr key={report.id} className="border-t border-slate-100">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-900">
                            {report.display_name || report.name}
                          </div>
                          {report.description && (
                            <div className="text-xs text-slate-500 mt-1">{report.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`
                            inline-block px-3 py-1 rounded-full text-sm font-medium
                            ${
                              report.deployment_status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : report.deployment_status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : report.deployment_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-800'
                            }
                          `}
                        >
                          {report.deployment_status}
                        </span>
                        {report.deployment_error && (
                          <div className="text-xs text-red-600 mt-1">{report.deployment_error}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {report.deployed_at ? new Date(report.deployed_at).toLocaleDateString() : '-'}
                        {report.deployed_by && (
                          <div className="text-xs text-slate-500">by {report.deployed_by}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                          {report.powerbi_report_id}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        {report.deployment_status === 'active' && (
                          <button
                            onClick={() => handleArchiveReport(report.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Available Templates Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Available Template Reports ({templateReports.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateReports.map((template) => {
              const isDeployed = deployedTemplateIds.has(template.id);

              return (
                <div
                  key={template.id}
                  className={`
                    border rounded-lg p-4
                    ${isDeployed ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-white'}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{template.name}</h3>
                    {template.category && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                        {template.category}
                      </span>
                    )}
                  </div>

                  {template.description && (
                    <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                  )}

                  <div className="text-xs text-slate-500 font-mono mb-3">
                    {template.powerbi_report_id}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setDeploymentForm({
                        powerbiReportId: '',
                        displayName: template.name,
                      });
                      setIsDeployModalOpen(true);
                    }}
                    disabled={isDeployed || !organization.powerbi_workspace_id}
                    className={`
                      w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isDeployed
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          : !organization.powerbi_workspace_id
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-[#00e5c0] text-white hover:bg-[#0eafaa]'
                      }
                    `}
                  >
                    {isDeployed ? 'Already Deployed' : 'Deploy'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deploy Report Modal */}
      {isDeployModalOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Deploy Report</h2>
              <button
                onClick={() => {
                  setIsDeployModalOpen(false);
                  setSelectedTemplate(null);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleDeployReport} className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-slate-700">
                  <strong>Template Report:</strong> {selectedTemplate.name}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  {selectedTemplate.powerbi_report_id}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organization's PowerBI Report ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deploymentForm.powerbiReportId}
                  onChange={(e) => setDeploymentForm({ ...deploymentForm, powerbiReportId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono"
                  placeholder="Enter the report ID from the organization's workspace"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500 mt-1">
                  After copying the report to {organization.name}'s workspace, enter the new report ID here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={deploymentForm.displayName}
                  onChange={(e) => setDeploymentForm({ ...deploymentForm, displayName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="Override the display name (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Deploying...' : 'Deploy Report'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeployModalOpen(false);
                    setSelectedTemplate(null);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
