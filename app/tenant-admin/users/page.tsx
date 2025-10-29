'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Mail, Calendar, Shield, Users as UsersIcon } from 'lucide-react';

interface UserRole {
  global_role_id: string;
  global_roles: {
    id: string;
    name: string;
    display_name: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string | null;
  is_tenant_admin: boolean;
  status: string;
  invited_at: string;
  activated_at: string | null;
  last_login_at: string | null;
  primary_role_id: string | null;
  user_roles: UserRole[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant-admin/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      invited: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#033c3a]">Users</h2>
          <p className="text-slate-600 mt-1">
            Manage users and their roles in your organization
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: Open invite user modal
            alert('Invite user functionality coming soon');
          }}
          className="flex items-center px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Invite User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <UsersIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No users found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Invite users to get started
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-[#e6ffff] rounded-full flex items-center justify-center">
                        <span className="text-[#033c3a] font-semibold">
                          {user.name
                            ? user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 flex items-center">
                          {user.name || 'No name'}
                          {user.is_tenant_admin && (
                            <Shield className="h-4 w-4 text-[#00e5c0] ml-2" title="Tenant Admin" />
                          )}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.user_roles.length === 0 ? (
                        <span className="text-sm text-slate-400">No roles</span>
                      ) : (
                        user.user_roles.map((role) => (
                          <span
                            key={role.global_role_id}
                            className="px-2 py-1 text-xs bg-[#e6ffff] text-[#033c3a] rounded"
                          >
                            {role.global_roles.display_name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(user.last_login_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        // TODO: Open edit user modal
                        alert('Edit user functionality coming soon');
                      }}
                      className="text-[#00e5c0] hover:text-[#0eafaa] mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement suspend/activate
                        alert('Suspend/Activate functionality coming soon');
                      }}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      {user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
