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
  lms_provider_id: string | null;
  english_maths_provider_id: string | null;
  crm_provider_id: string | null;
  hr_provider_id: string | null;
  billing_email: string | null;
  billing_contact_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  status: string;
  learner_count: number;
  current_period_start: string | null;
  current_period_end: string | null;
  pricing_tiers: {
    id: string;
    name: string;
    display_name: string;
    tier_level: number;
    price_per_learner: number;
    included_learners: number;
    overage_price: number;
  } | null;
}

interface User {
  id: string;
  email: string;
  is_tenant_admin: boolean;
  created_at: string;
  last_login: string | null;
}

interface DeployedReport {
  id: string;
  powerbi_report_id: string;
  powerbi_workspace_id: string;
  name: string;
  display_name: string | null;
  deployment_status: string;
  deployed_at: string | null;
  template_report: {
    id: string;
    name: string;
    display_name: string | null;
  } | null;
}

interface AIStats {
  totalSummaries: number;
  totalTokens: number;
  last30DaysSummaries: number;
}

interface OrganizationProfileProps {
  organization: Organization;
  subscription: Subscription | null;
  users: User[];
  deployedReports: DeployedReport[];
  aiStats: AIStats;
}

type Tab = 'overview' | 'reports' | 'users' | 'usage' | 'ai';

export default function OrganizationProfileWrapper({
  organization,
  subscription,
  users,
  deployedReports,
  aiStats,
}: OrganizationProfileProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    powerbiWorkspaceId: organization.powerbi_workspace_id || '',
    powerbiWorkspaceName: organization.powerbi_workspace_name || '',
    billingEmail: organization.billing_email || '',
    billingContactName: organization.billing_contact_name || '',
  });

  const handleSave = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          powerbiWorkspaceId: formData.powerbiWorkspaceId || null,
          powerbiWorkspaceName: formData.powerbiWorkspaceName || null,
          billingEmail: formData.billingEmail || null,
          billingContactName: formData.billingContactName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organization');
      }

      // Success - exit edit mode and refresh
      setIsEditMode(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      powerbiWorkspaceId: organization.powerbi_workspace_id || '',
      powerbiWorkspaceName: organization.powerbi_workspace_name || '',
      billingEmail: organization.billing_email || '',
      billingContactName: organization.billing_contact_name || '',
    });
    setIsEditMode(false);
    setError(null);
  };

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: '📊' },
    { id: 'reports' as Tab, label: 'Report Deployments', icon: '📈', count: deployedReports.length },
    { id: 'users' as Tab, label: 'Users', icon: '👥', count: users.length },
    { id: 'usage' as Tab, label: 'Usage Statistics', icon: '📉' },
    { id: 'ai' as Tab, label: 'AI Usage', icon: '🤖', count: aiStats.totalSummaries },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/super-admin" className="hover:text-slate-900">
              Super Admin
            </Link>
            <span>/</span>
            <Link href="/super-admin" className="hover:text-slate-900">
              Organizations
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{organization.name}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {organization.name}
              </h1>
              <a
                href={`https://${organization.subdomain}.skillsintelligencesystem.co.uk`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00e5c0] hover:text-[#0eafaa] transition-colors flex items-center gap-2"
              >
                {organization.subdomain}.skillsintelligencesystem.co.uk
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="flex items-center gap-3">
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
                >
                  Edit Organization
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex gap-4 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-3 border-b-2 font-medium transition-colors relative
                    ${
                      activeTab === tab.id
                        ? 'border-[#00e5c0] text-[#00e5c0]'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab
                organization={organization}
                subscription={subscription}
                formData={formData}
                setFormData={setFormData}
                isEditMode={isEditMode}
              />
            )}
            {activeTab === 'reports' && <ReportsTab reports={deployedReports} organizationId={organization.id} />}
            {activeTab === 'users' && <UsersTab users={users} organizationId={organization.id} />}
            {activeTab === 'usage' && <UsageTab organization={organization} />}
            {activeTab === 'ai' && <AITab aiStats={aiStats} organizationId={organization.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  organization,
  subscription,
  formData,
  setFormData,
  isEditMode,
}: {
  organization: Organization;
  subscription: Subscription | null;
  formData: any;
  setFormData: any;
  isEditMode: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* Subscription Information */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Subscription</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tier</label>
            <p className="text-slate-900">
              {subscription?.pricing_tiers?.display_name || 'No active subscription'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <span
              className={`
                inline-block px-3 py-1 rounded-full text-sm font-medium
                ${
                  subscription?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-600'
                }
              `}
            >
              {subscription?.status || 'Inactive'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Learner Count</label>
            <p className="text-slate-900">{subscription?.learner_count || 0}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Period End</label>
            <p className="text-slate-900">
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* PowerBI Workspace */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">PowerBI Workspace</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Workspace ID
            </label>
            <input
              type="text"
              value={formData.powerbiWorkspaceId}
              onChange={(e) => setFormData({ ...formData, powerbiWorkspaceId: e.target.value })}
              disabled={!isEditMode}
              className={`
                w-full px-4 py-2 border rounded-lg font-mono text-sm
                ${
                  isEditMode
                    ? 'border-slate-300 focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }
              `}
              placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={formData.powerbiWorkspaceName}
              onChange={(e) => setFormData({ ...formData, powerbiWorkspaceName: e.target.value })}
              disabled={!isEditMode}
              className={`
                w-full px-4 py-2 border rounded-lg
                ${
                  isEditMode
                    ? 'border-slate-300 focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }
              `}
              placeholder="e.g., fws_demo1_prod"
            />
          </div>
        </div>
      </div>

      {/* Billing Contact */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Billing Contact</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.billingContactName}
              onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
              disabled={!isEditMode}
              className={`
                w-full px-4 py-2 border rounded-lg
                ${
                  isEditMode
                    ? 'border-slate-300 focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }
              `}
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.billingEmail}
              onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
              disabled={!isEditMode}
              className={`
                w-full px-4 py-2 border rounded-lg
                ${
                  isEditMode
                    ? 'border-slate-300 focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }
              `}
              placeholder="billing@example.com"
            />
          </div>
        </div>
      </div>

      {/* Key Dates */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Key Dates</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Created</label>
            <p className="text-slate-900">
              {new Date(organization.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Updated</label>
            <p className="text-slate-900">
              {new Date(organization.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reports Tab Component
function ReportsTab({ reports, organizationId }: { reports: DeployedReport[]; organizationId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Deployed PowerBI Reports</h2>
        <Link
          href={`/super-admin/organizations/${organizationId}/reports`}
          className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
        >
          Manage Reports
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">No reports deployed yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Report Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Template</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Deployed</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Report ID</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-slate-100">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">
                      {report.display_name || report.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {report.template_report?.display_name || report.template_report?.name}
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
                            : 'bg-red-100 text-red-800'
                        }
                      `}
                    >
                      {report.deployment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {report.deployed_at
                      ? new Date(report.deployed_at).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                      {report.powerbi_report_id.substring(0, 8)}...
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, organizationId }: { users: User[]; organizationId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Users ({users.length})</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Role</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Joined</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-900">{user.email}</div>
                </td>
                <td className="py-3 px-4">
                  {user.is_tenant_admin ? (
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      Tenant Admin
                    </span>
                  ) : (
                    <span className="text-slate-600">User</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Usage Tab Component
function UsageTab({ organization }: { organization: Organization }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Usage Statistics</h2>
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <p className="text-slate-600">Usage statistics coming soon</p>
      </div>
    </div>
  );
}

// AI Tab Component
function AITab({ aiStats, organizationId }: { aiStats: AIStats; organizationId: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-6">AI Usage & Statistics</h2>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="text-sm text-slate-600 mb-1">Total Summaries</div>
          <div className="text-3xl font-bold text-slate-900">{aiStats.totalSummaries}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="text-sm text-slate-600 mb-1">Last 30 Days</div>
          <div className="text-3xl font-bold text-slate-900">{aiStats.last30DaysSummaries}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="text-sm text-slate-600 mb-1">Total Tokens Used</div>
          <div className="text-3xl font-bold text-slate-900">{aiStats.totalTokens.toLocaleString()}</div>
        </div>
      </div>

      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <p className="text-slate-600">Detailed AI analytics coming soon</p>
      </div>
    </div>
  );
}
