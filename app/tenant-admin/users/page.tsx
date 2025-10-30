'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Mail, Calendar, Shield, Users as UsersIcon, X } from 'lucide-react';

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
  can_create_users: boolean;
  can_create_any_user: boolean;
  status: string;
  invited_at: string;
  activated_at: string | null;
  last_login_at: string | null;
  primary_role_id: string | null;
  user_roles?: UserRole[];
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  role_category: string | null;
  role_level: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteIsTenantAdmin, setInviteIsTenantAdmin] = useState(false);
  const [inviteCanCreateUsers, setInviteCanCreateUsers] = useState(false);
  const [inviteCanCreateAnyUser, setInviteCanCreateAnyUser] = useState(false);
  const [inviteRoleIds, setInviteRoleIds] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIsTenantAdmin, setEditIsTenantAdmin] = useState(false);
  const [editCanCreateUsers, setEditCanCreateUsers] = useState(false);
  const [editCanCreateAnyUser, setEditCanCreateAnyUser] = useState(false);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant-admin/users');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData, null, 2));
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      // Fetch only assignable roles based on current user's permissions
      const response = await fetch('/api/tenant-admin/roles/assignable');
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);

    try {
      const response = await fetch('/api/tenant-admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          isTenantAdmin: inviteIsTenantAdmin,
          canCreateUsers: inviteCanCreateUsers,
          canCreateAnyUser: inviteCanCreateAnyUser,
          roleIds: inviteRoleIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite user');
      }

      // Reset form
      setInviteEmail('');
      setInviteName('');
      setInviteIsTenantAdmin(false);
      setInviteCanCreateUsers(false);
      setInviteCanCreateAnyUser(false);
      setInviteRoleIds([]);
      setShowInviteModal(false);

      // Refresh users list
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setEditSubmitting(true);

    try {
      const response = await fetch(`/api/tenant-admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          isTenantAdmin: editIsTenantAdmin,
          canCreateUsers: editCanCreateUsers,
          canCreateAnyUser: editCanCreateAnyUser,
          roleIds: editRoleIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name || '');
    setEditIsTenantAdmin(user.is_tenant_admin);
    setEditCanCreateUsers(user.can_create_users || false);
    setEditCanCreateAnyUser(user.can_create_any_user || false);
    setEditRoleIds(user.user_roles?.map((r) => r.global_role_id) || []);
    setShowEditModal(true);
  };

  const handleStatusToggle = async (user: User) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';

    try {
      const response = await fetch(`/api/tenant-admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleRole = (roleId: string, isInvite: boolean) => {
    if (isInvite) {
      setInviteRoleIds((prev) =>
        prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
    } else {
      setEditRoleIds((prev) =>
        prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
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
          onClick={() => setShowInviteModal(true)}
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
                      {!user.user_roles || user.user_roles.length === 0 ? (
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
                      onClick={() => openEditModal(user)}
                      className="text-[#00e5c0] hover:text-[#0eafaa] mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleStatusToggle(user)}
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

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Permissions
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inviteIsTenantAdmin}
                    onChange={(e) => setInviteIsTenantAdmin(e.target.checked)}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Tenant Admin</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inviteCanCreateUsers}
                    onChange={(e) => setInviteCanCreateUsers(e.target.checked)}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Can create users in own hierarchy</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inviteCanCreateAnyUser}
                    onChange={(e) => setInviteCanCreateAnyUser(e.target.checked)}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Can create any user (except Tenant Admin)</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign Roles
                </label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-3">
                  {(() => {
                    // Group roles by category
                    const grouped = roles.reduce((acc, role) => {
                      const category = role.role_category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(role);
                      return acc;
                    }, {} as Record<string, typeof roles>);

                    // Sort categories: Senior Leadership first, then alphabetically
                    const sortedCategories = Object.keys(grouped).sort((a, b) => {
                      if (a === 'Other') return 1;
                      if (b === 'Other') return -1;
                      if (a === 'leadership') return -1;
                      if (b === 'leadership') return 1;
                      return a.localeCompare(b);
                    });

                    return sortedCategories.map((category) => (
                      <div key={category}>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
                          {category === 'operations' ? 'Operations' :
                           category === 'quality' ? 'Quality' :
                           category === 'compliance' ? 'Compliance' :
                           category === 'sales' ? 'Sales' :
                           category === 'leadership' ? 'Senior Leadership' :
                           category}
                        </div>
                        <div className="space-y-2 ml-2">
                          {grouped[category]
                            .sort((a, b) => a.role_level - b.role_level)
                            .map((role) => (
                              <label key={role.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  checked={inviteRoleIds.includes(role.id)}
                                  onChange={() => toggleRole(role.id, true)}
                                  className="mt-1 rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                                />
                                <div className="ml-2">
                                  <div className="text-sm text-slate-900">{role.display_name}</div>
                                  {role.description && (
                                    <div className="text-xs text-slate-500">{role.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] disabled:opacity-50"
                >
                  {inviteSubmitting ? 'Inviting...' : 'Invite User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Permissions
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editIsTenantAdmin}
                    onChange={(e) => setEditIsTenantAdmin(e.target.checked)}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Tenant Admin</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editCanCreateUsers}
                    onChange={(e) => setEditCanCreateUsers(e.target.checked)}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Can create users in own hierarchy</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editCanCreateAnyUser}
                    onChange={(e) => setEditCanCreateAnyUser(e.target.checked)}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Can create any user (except Tenant Admin)</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign Roles
                </label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-3">
                  {(() => {
                    // Group roles by category
                    const grouped = roles.reduce((acc, role) => {
                      const category = role.role_category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(role);
                      return acc;
                    }, {} as Record<string, typeof roles>);

                    // Sort categories: Senior Leadership first, then alphabetically
                    const sortedCategories = Object.keys(grouped).sort((a, b) => {
                      if (a === 'Other') return 1;
                      if (b === 'Other') return -1;
                      if (a === 'leadership') return -1;
                      if (b === 'leadership') return 1;
                      return a.localeCompare(b);
                    });

                    return sortedCategories.map((category) => (
                      <div key={category}>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
                          {category === 'operations' ? 'Operations' :
                           category === 'quality' ? 'Quality' :
                           category === 'compliance' ? 'Compliance' :
                           category === 'sales' ? 'Sales' :
                           category === 'leadership' ? 'Senior Leadership' :
                           category}
                        </div>
                        <div className="space-y-2 ml-2">
                          {grouped[category]
                            .sort((a, b) => a.role_level - b.role_level)
                            .map((role) => (
                              <label key={role.id} className="flex items-start">
                                <input
                                  type="checkbox"
                                  checked={editRoleIds.includes(role.id)}
                                  onChange={() => toggleRole(role.id, false)}
                                  className="mt-1 rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                                />
                                <div className="ml-2">
                                  <div className="text-sm text-slate-900">{role.display_name}</div>
                                  {role.description && (
                                    <div className="text-xs text-slate-500">{role.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
