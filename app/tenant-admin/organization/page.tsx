'use client';

import { useEffect, useState } from 'react';
import { Building2, Mail, User, Save } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  billing_email: string | null;
  billing_contact_name: string | null;
}

export default function OrganizationPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingContactName, setBillingContactName] = useState('');

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant-admin/organization');

      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }

      const data = await response.json();
      setOrganization(data);
      setName(data.name || '');
      setBillingEmail(data.billing_email || '');
      setBillingContactName(data.billing_contact_name || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/tenant-admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          billing_email: billingEmail,
          billing_contact_name: billingContactName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update organization');
      }

      await fetchOrganization();
      alert('Organization settings updated successfully');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading organization...</p>
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#033c3a]">Organization Settings</h2>
        <p className="text-slate-600 mt-1">
          Manage your organization details and configuration
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Building2 className="inline h-4 w-4 mr-2" />
              Organization Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
              placeholder="Your Organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subdomain
            </label>
            <input
              type="text"
              value={organization?.subdomain || ''}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Your organization's unique subdomain cannot be changed
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Billing Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="billing@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Billing Contact Name
                </label>
                <input
                  type="text"
                  value={billingContactName}
                  onChange={(e) => setBillingContactName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
