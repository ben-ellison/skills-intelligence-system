'use client';

import { useState, useEffect } from 'react';

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
}

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organization: Organization | null;
}

export default function EditOrganizationModal({
  isOpen,
  onClose,
  onSuccess,
  organization,
}: EditOrganizationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsModuleInit, setNeedsModuleInit] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    powerbiWorkspaceId: '',
    powerbiWorkspaceName: '',
    billingEmail: '',
    billingContactName: '',
  });

  // Update form when organization changes
  useEffect(() => {
    if (organization) {
      setFormData({
        powerbiWorkspaceId: organization.powerbi_workspace_id || '',
        powerbiWorkspaceName: organization.powerbi_workspace_name || '',
        billingEmail: organization.billing_email || '',
        billingContactName: organization.billing_contact_name || '',
      });
      // Check if modules need to be initialized
      setNeedsModuleInit(!organization.powerbi_workspace_id);
    }
  }, [organization]);

  if (!isOpen || !organization) return null;

  const handleSubmit = async () => {
    setError(null);

    // Validate PowerBI workspace fields if provided
    if (formData.powerbiWorkspaceId || formData.powerbiWorkspaceName) {
      if (!formData.powerbiWorkspaceId.trim()) {
        setError('PowerBI Workspace ID is required if Workspace Name is provided');
        return;
      }
      if (!formData.powerbiWorkspaceName.trim()) {
        setError('Workspace Name is required if Workspace ID is provided');
        return;
      }
      // Basic GUID format validation
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(formData.powerbiWorkspaceId)) {
        setError('PowerBI Workspace ID must be a valid GUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          powerbiWorkspaceId: formData.powerbiWorkspaceId || null,
          powerbiWorkspaceName: formData.powerbiWorkspaceName || null,
          billingEmail: formData.billingEmail || null,
          billingContactName: formData.billingContactName || null,
          initializeModules: needsModuleInit && !!formData.powerbiWorkspaceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organization');
      }

      // Success!
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Edit Organization</h2>
              <p className="text-sm text-slate-600 mt-1">{organization.name}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {needsModuleInit && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Modules will be initialized</p>
                  <p className="text-blue-700">
                    When you add PowerBI workspace details, we'll automatically copy all 14 module templates
                    to this organization. This enables the role-based navigation system.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Organization Info (Read-only) */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Organization Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Subdomain:</span>
                  <p className="font-medium text-slate-900">{organization.subdomain}.skillsintelligencesystem.co.uk</p>
                </div>
                <div>
                  <span className="text-slate-600">Created:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* PowerBI Workspace */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">PowerBI Workspace</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PowerBI Workspace ID
                  </label>
                  <input
                    type="text"
                    value={formData.powerbiWorkspaceId}
                    onChange={e => setFormData({ ...formData, powerbiWorkspaceId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The unique GUID identifier for the PowerBI workspace
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={formData.powerbiWorkspaceName}
                    onChange={e => setFormData({ ...formData, powerbiWorkspaceName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., fws_demo1_prod"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The human-readable name of the workspace
                  </p>
                </div>
              </div>
            </div>

            {/* Billing Contact */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Billing Contact</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.billingContactName}
                    onChange={e => setFormData({ ...formData, billingContactName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="John Smith"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.billingEmail}
                    onChange={e => setFormData({ ...formData, billingEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="billing@example.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
