'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Schema {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  provider_type: string | null;
  is_active: boolean;
  created_at: string;
  mappingCount: number;
}

interface DatabaseSchemasProps {
  schemas: Schema[];
}

export default function DatabaseSchemasWrapper({ schemas }: DatabaseSchemasProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new schema
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    providerType: 'lms',
  });

  const handleCreate = async () => {
    setError(null);

    // Validation
    if (!formData.name.trim() || !formData.displayName.trim()) {
      setError('Name and Display Name are required');
      return;
    }

    // Name should be lowercase with no spaces
    const name = formData.name.toLowerCase().replace(/\s+/g, '_');

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/super-admin/database-schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          displayName: formData.displayName,
          description: formData.description || null,
          providerType: formData.providerType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create schema');
      }

      // Success - close modal and refresh
      setIsCreateModalOpen(false);
      setFormData({ name: '', displayName: '', description: '', providerType: 'lms' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <span className="text-slate-900 font-medium">Database Schemas</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Database Schemas</h1>
              <p className="text-slate-600">
                Configure field mappings for different LMS providers (BUD, Aptem, OneFile, etc.)
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
            >
              + New Schema
            </button>
          </div>
        </div>

        {/* Schemas Grid */}
        {schemas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Schemas Yet</h3>
            <p className="text-slate-600 mb-4">
              Create your first database schema to start mapping fields
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
            >
              + Create Schema
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schemas.map((schema) => (
              <Link
                key={schema.id}
                href={`/super-admin/database-schemas/${schema.id}`}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-1">
                      {schema.display_name}
                    </h3>
                    <code className="text-sm text-slate-500">{schema.name}</code>
                  </div>
                  {schema.provider_type && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      {schema.provider_type.toUpperCase()}
                    </span>
                  )}
                </div>

                {schema.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{schema.description}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-sm">
                    <span className="text-slate-600">Field Mappings:</span>
                    <span className="ml-2 font-semibold text-[#00e5c0]">{schema.mappingCount}</span>
                  </div>
                  {schema.is_active ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Schema Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Create Schema</h2>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    disabled={isSubmitting}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Schema Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                      placeholder="e.g., bud, aptem, onefile"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Lowercase, no spaces (will be auto-formatted)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                      placeholder="e.g., BUD, Aptem, OneFile"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Provider Type
                    </label>
                    <select
                      value={formData.providerType}
                      onChange={(e) => setFormData({ ...formData, providerType: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                      disabled={isSubmitting}
                    >
                      <option value="lms">LMS</option>
                      <option value="crm">CRM</option>
                      <option value="hr">HR</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                      rows={3}
                      placeholder="Optional description..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex justify-between">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Schema'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
