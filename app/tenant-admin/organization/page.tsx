'use client';

import { useEffect, useState, useRef } from 'react';
import { Building2, Mail, User, Save, Upload, X, Image as ImageIcon } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  billing_email: string | null;
  billing_contact_name: string | null;
  logo_url: string | null;
}

export default function OrganizationPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PNG, JPEG, SVG, or WebP image.');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 2MB.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/tenant-admin/organization/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      await fetchOrganization();
      alert('Logo uploaded successfully');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) {
      return;
    }

    setUploading(true);

    try {
      const response = await fetch('/api/tenant-admin/organization/logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove logo');
      }

      await fetchOrganization();
      alert('Logo removed successfully');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
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
        <h2 className="text-2xl font-bold text-[#033c3a]">Organisation Settings</h2>
        <p className="text-slate-600 mt-1">
          Manage your organisation details and configuration
        </p>
      </div>

      {/* Logo Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Organisation Logo</h3>
        <p className="text-sm text-slate-600 mb-4">
          Upload a logo to replace your organisation name throughout the platform for dual branding.
        </p>

        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            {organization?.logo_url ? (
              <div className="relative group">
                <img
                  src={organization.logo_url}
                  alt="Organisation logo"
                  className="h-24 w-auto max-w-[200px] object-contain border border-slate-200 rounded-lg p-2 bg-white"
                />
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="h-24 w-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                <ImageIcon className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                uploading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : organization?.logo_url ? 'Change Logo' : 'Upload Logo'}
            </label>
            <p className="text-xs text-slate-500 mt-2">
              PNG, JPG, SVG or WebP. Maximum 2MB.
            </p>
          </div>
        </div>
      </div>

      {/* Organization Details Form */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Building2 className="inline h-4 w-4 mr-2" />
              Organisation Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
              placeholder="Your Organisation"
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
              Your organisation's unique subdomain cannot be changed
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
