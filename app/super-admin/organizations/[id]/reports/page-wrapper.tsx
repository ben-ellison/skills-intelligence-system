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
  globalModules?: any[];
  globalTabs?: any[];
  orgModules?: any[];
  orgTabs?: any[];
}

interface ScanResult {
  deployed: any[];
  failed: any[];
  unmatched: any[];
  summary: {
    totalWorkspaceReports: number;
    matched: number;
    deployed: number;
    failed: number;
    unmatched: number;
  };
  organizationName: string;
  workspaceName: string;
}

export default function ManageReportsWrapper({
  organization,
  templateReports,
  deployedReports,
  globalModules = [],
  globalTabs = [],
  orgModules = [],
  orgTabs = [],
}: ManageReportsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

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

  const handleScanWorkspace = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setScanResults(null);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/reports/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scan workspace');
      }

      const result = await response.json();

      // Store results for the modal
      setScanResults(result);
      setShowResultsModal(true);

      // Show summary message
      setSuccess(
        `Workspace scanned! ` +
        `Deployed ${result.summary.deployed} report(s), ` +
        `${result.summary.failed} failed, ` +
        `${result.summary.unmatched} unmatched. Click to view details.`
      );

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
                Automatically match and deploy reports from {organization.name}'s PowerBI workspace
              </p>
            </div>
            <button
              onClick={handleScanWorkspace}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              disabled={!organization.powerbi_workspace_id || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </span>
              ) : (
                '🔍 Scan Workspace & Auto-Deploy'
              )}
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
            <div className="flex items-center justify-between">
              <p className="text-green-800 text-sm">{success}</p>
              {scanResults && (
                <button
                  onClick={() => setShowResultsModal(true)}
                  className="text-green-700 hover:text-green-900 text-sm font-medium underline"
                >
                  View Details
                </button>
              )}
            </div>
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

        {/* Module & Tab Configuration Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Module & Tab Configuration</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Module</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Tab</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Report</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Page</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {globalModules.flatMap((module: any) => {
                  // Get tabs for this module from global tabs
                  const moduleTabs = globalTabs.filter((tab: any) => tab.module_name === module.name);

                  if (moduleTabs.length === 0) return [];

                  return moduleTabs.map((tab: any, index: number) => {
                    // Find if there's an org-specific override for this tab
                    const orgModule = orgModules.find((om: any) => om.name === module.name);
                    const orgTab = orgModule ? orgTabs.find((ot: any) =>
                      ot.module_id === orgModule.id && ot.tab_name === tab.tab_name
                    ) : null;

                    const isDeployed = orgTab !== null;

                    return (
                      <tr key={`${module.id}-${tab.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                        {index === 0 && (
                          <td className="py-3 px-4 font-medium text-slate-900" rowSpan={moduleTabs.length}>
                            {module.display_name}
                          </td>
                        )}
                        <td className="py-3 px-4 text-slate-700">{tab.tab_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {tab.powerbi_reports?.name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {tab.page_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {isDeployed ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Deployed
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              Not Deployed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>

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
                            Report #{report.id.substring(0, 8)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Template: {report.template_report_id?.substring(0, 8)}</div>
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

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">How Automatic Report Deployment Works</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. Click "Scan Workspace & Auto-Deploy" to scan the organization's PowerBI workspace</p>
                <p>2. The system fetches all reports from the workspace using PowerBI REST API</p>
                <p>3. Reports are automatically matched to template reports by name (case-insensitive)</p>
                <p>4. Matched reports are instantly deployed and appear in the "Deployed Reports" section above</p>
                <p className="mt-3 font-medium">📝 Note: Make sure report names in the organization's workspace match the template report names exactly (spaces and capitalization don't matter)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Results Modal */}
      {showResultsModal && scanResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Scan Results</h2>
                  <p className="text-slate-600 text-sm mt-1">
                    {scanResults.workspaceName} • {scanResults.summary.totalWorkspaceReports} reports found
                  </p>
                </div>
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 text-sm font-medium">Deployed</div>
                  <div className="text-3xl font-bold text-green-900">{scanResults.summary.deployed}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-600 text-sm font-medium">Failed</div>
                  <div className="text-3xl font-bold text-red-900">{scanResults.summary.failed}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-yellow-600 text-sm font-medium">Unmatched</div>
                  <div className="text-3xl font-bold text-yellow-900">{scanResults.summary.unmatched}</div>
                </div>
              </div>

              {/* Newly Deployed Reports */}
              {scanResults.deployed.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Newly Deployed ({scanResults.deployed.length})
                  </h3>
                  <div className="space-y-2">
                    {scanResults.deployed.map((item: any, index: number) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="font-medium text-green-900">
                          {item.module} → {item.tab}
                        </div>
                        <div className="text-sm text-green-800 mt-1">
                          Report: {item.report}
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          Page: {item.page}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already Deployed Reports */}
              {scanResults.alreadyDeployed && scanResults.alreadyDeployed.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Already Deployed ({scanResults.alreadyDeployed.length})
                  </h3>
                  <div className="space-y-2">
                    {scanResults.alreadyDeployed.map((item: any, index: number) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="font-medium text-blue-900">
                          {item.module} → {item.tab}
                        </div>
                        <div className="text-sm text-blue-800 mt-1">
                          Report: {item.report}
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          Page: {item.page}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Reports */}
              {scanResults.failed.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Failed Deployments ({scanResults.failed.length})
                  </h3>
                  <div className="space-y-2">
                    {scanResults.failed.map((report: any, index: number) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="font-medium text-red-900">{report.templateName}</div>
                        <div className="text-xs text-red-700 mt-1">PowerBI ID: {report.powerbiReportId}</div>
                        <div className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded">
                          <strong>Error:</strong> {report.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched Reports */}
              {scanResults.unmatched.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Unmatched Reports ({scanResults.unmatched.length})
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                    <p className="text-sm text-yellow-800">
                      These reports exist in the PowerBI workspace but don't match any template report names.
                      They won't be deployed unless you add them as templates or match their names.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {scanResults.unmatched.map((report: any, index: number) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="font-medium text-yellow-900">{report.reportName}</div>
                        {report.type === 'page_not_found' && (
                          <div className="text-sm text-yellow-800 mt-1">
                            Expected page "{report.expectedPage}" not found in report
                          </div>
                        )}
                        {report.pages && report.pages.length > 0 && (
                          <div className="text-xs text-yellow-700 mt-1">
                            Pages: {report.pages.map((p: any) => p.displayName || p.name).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6">
              <button
                onClick={() => setShowResultsModal(false)}
                className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
