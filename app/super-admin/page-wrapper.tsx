'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CreateOrganizationWizard from './components/CreateOrganizationWizard';
import EditOrganizationModal from './components/EditOrganizationModal';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  powerbi_workspace_id: string | null;
  powerbi_workspace_name: string | null;
  lms_provider_id: string | null;
  english_maths_provider_id: string | null;
  crm_provider_id: string | null;
  hr_provider_id: string | null;
  billing_email: string | null;
  billing_contact_name: string | null;
}

interface User {
  id: string;
  email: string;
  is_super_admin: boolean;
  is_tenant_admin: boolean;
  created_at: string;
  organizations: { name: string } | null;
}

interface Subscription {
  id: string;
  status: string;
  learner_count: number;
  current_period_end: string | null;
  organizations: { name: string } | null;
  pricing_tiers: { name: string } | null;
}

interface IntegrationProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  description: string | null;
  logo_url: string | null;
}

interface SuperAdminData {
  organizations: Organization[];
  users: User[];
  subscriptions: Subscription[];
  integrationProviders: IntegrationProvider[];
}

export default function SuperAdminPageWrapper({ initialData }: { initialData: SuperAdminData }) {
  const [data, setData] = useState<SuperAdminData>(initialData);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Fetch updated organization, user, and subscription data
      // For now, just reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalOrgs = data.organizations.length;
  const totalUsers = data.users.length;
  const activeSubscriptions = data.subscriptions.filter(s => s.status === 'active').length;
  const superAdmins = data.users.filter(u => u.is_super_admin).length;
  const tenantAdmins = data.users.filter(u => u.is_tenant_admin).length;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Super Admin Portal
              </h1>
              <p className="text-slate-600">
                Platform-wide management and analytics
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/super-admin/reports"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#e6ffff] rounded-lg">
                <svg className="w-6 h-6 text-[#00e5c0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">PowerBI Reports</h3>
                <p className="text-sm text-slate-600">Manage report library</p>
              </div>
            </div>
          </Link>

          <Link
            href="/super-admin/module-tabs"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#e6ffff] rounded-lg">
                <svg className="w-6 h-6 text-[#00e5c0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Module Tabs</h3>
                <p className="text-sm text-slate-600">Configure module tabs</p>
              </div>
            </div>
          </Link>

          <Link
            href="/super-admin/roles"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Global Roles</h3>
                <p className="text-sm text-slate-600">Configure user roles</p>
              </div>
            </div>
          </Link>

          <Link
            href="/super-admin/integration-defaults"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Integration Defaults</h3>
                <p className="text-sm text-slate-600">Provider configurations</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Organizations</h3>
            <p className="text-3xl font-bold text-[#00e5c0]">{totalOrgs}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Active Subscriptions</h3>
            <p className="text-3xl font-bold text-green-600">{activeSubscriptions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Admins</h3>
            <p className="text-3xl font-bold text-orange-600">{superAdmins + tenantAdmins}</p>
            <p className="text-xs text-slate-500 mt-1">
              {superAdmins} Super, {tenantAdmins} Tenant
            </p>
          </div>
        </div>

        {/* Organizations Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Organizations</h2>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
            >
              + New Organization
            </button>
          </div>

          {data.organizations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Subdomain</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.organizations.map((org) => (
                    <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900">{org.name}</td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                          {org.subdomain}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/super-admin/organizations/${org.id}/reports`}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                        >
                          Reports
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setIsEditModalOpen(true);
                          }}
                          className="text-slate-600 hover:text-slate-800 text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No organizations yet. Create your first organization to get started.
            </div>
          )}
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">All Users</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              + Invite User
            </button>
          </div>

          {data.users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Organization</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900">{user.email}</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {user.organizations ? user.organizations.name : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {user.is_super_admin && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-[#0eafaa] bg-[#e6ffff] rounded">
                            Super Admin
                          </span>
                        )}
                        {!user.is_super_admin && user.is_tenant_admin && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded">
                            Tenant Admin
                          </span>
                        )}
                        {!user.is_super_admin && !user.is_tenant_admin && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded">
                            User
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm mr-3">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No users found.
            </div>
          )}
        </div>

        {/* Subscriptions Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Subscriptions</h2>

          {data.subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Organization</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Tier</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Learners</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Next Billing</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900">
                        {sub.organizations?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {sub.pricing_tiers?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sub.learner_count}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          sub.status === 'active'
                            ? 'text-green-700 bg-green-100'
                            : sub.status === 'cancelled'
                            ? 'text-red-700 bg-red-100'
                            : 'text-slate-700 bg-slate-100'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No active subscriptions.
            </div>
          )}
        </div>

        {/* Wizard Modal */}
        <CreateOrganizationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={refreshData}
          integrationProviders={data.integrationProviders}
        />

        {/* Edit Organization Modal */}
        <EditOrganizationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOrg(null);
          }}
          onSuccess={refreshData}
          organization={selectedOrg}
        />
      </div>
    </div>
  );
}
