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
}

interface FieldMapping {
  id: string;
  schema_id: string;
  standard_field_name: string;
  standard_field_label: string;
  table_name: string | null;
  mapped_field_name: string;
  field_type: string;
  is_required: boolean;
  description: string | null;
  used_for_filtering: boolean;
  used_for_ai: boolean;
  is_active: boolean;
}

interface SchemaDetailProps {
  schema: Schema;
  mappings: FieldMapping[];
}

export default function SchemaDetailWrapper({ schema, mappings }: SchemaDetailProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    standardFieldName: '',
    standardFieldLabel: '',
    tableName: '',
    mappedFieldName: '',
    fieldType: 'text',
    isRequired: false,
    description: '',
    usedForFiltering: true,
    usedForAi: false,
  });

  const resetForm = () => {
    setFormData({
      standardFieldName: '',
      standardFieldLabel: '',
      tableName: '',
      mappedFieldName: '',
      fieldType: 'text',
      isRequired: false,
      description: '',
      usedForFiltering: true,
      usedForAi: false,
    });
    setEditingMapping(null);
    setError(null);
  };

  const handleEdit = (mapping: FieldMapping) => {
    setFormData({
      standardFieldName: mapping.standard_field_name,
      standardFieldLabel: mapping.standard_field_label,
      tableName: mapping.table_name || '',
      mappedFieldName: mapping.mapped_field_name,
      fieldType: mapping.field_type,
      isRequired: mapping.is_required,
      description: mapping.description || '',
      usedForFiltering: mapping.used_for_filtering,
      usedForAi: mapping.used_for_ai,
    });
    setEditingMapping(mapping);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!formData.standardFieldName.trim() || !formData.standardFieldLabel.trim() || !formData.mappedFieldName.trim()) {
      setError('Standard Field Name, Label, and Mapped Field Name are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingMapping
        ? `/api/super-admin/database-schemas/${schema.id}/mappings/${editingMapping.id}`
        : `/api/super-admin/database-schemas/${schema.id}/mappings`;

      const response = await fetch(url, {
        method: editingMapping ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardFieldName: formData.standardFieldName.toLowerCase().replace(/\s+/g, '_'),
          standardFieldLabel: formData.standardFieldLabel,
          tableName: formData.tableName || null,
          mappedFieldName: formData.mappedFieldName,
          fieldType: formData.fieldType,
          isRequired: formData.isRequired,
          description: formData.description || null,
          usedForFiltering: formData.usedForFiltering,
          usedForAi: formData.usedForAi,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save field mapping');
      }

      // Success - close modal and refresh
      setIsCreateModalOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this field mapping?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/super-admin/database-schemas/${schema.id}/mappings/${mappingId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete field mapping');
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
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
            <Link href="/super-admin/database-schemas" className="hover:text-slate-900">
              Database Schemas
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">{schema.display_name}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{schema.display_name}</h1>
                {schema.provider_type && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {schema.provider_type.toUpperCase()}
                  </span>
                )}
              </div>
              <code className="text-sm text-slate-500">{schema.name}</code>
              {schema.description && (
                <p className="text-slate-600 mt-2">{schema.description}</p>
              )}
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
            >
              + Add Field Mapping
            </button>
          </div>
        </div>

        {/* Field Mappings Table */}
        {mappings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Field Mappings Yet</h3>
            <p className="text-slate-600 mb-4">
              Add your first field mapping to configure how standard fields map to this schema
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
            >
              + Add Field Mapping
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Standard Field</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Table</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mapped Field</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Usage</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="border-t border-slate-100">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-900">{mapping.standard_field_label}</div>
                        <code className="text-xs text-slate-500">{mapping.standard_field_name}</code>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {mapping.table_name ? (
                        <code className="text-sm bg-purple-50 text-purple-800 px-2 py-1 rounded">
                          {mapping.table_name}
                        </code>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                        {mapping.mapped_field_name}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">{mapping.field_type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {mapping.used_for_filtering && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            Filtering
                          </span>
                        )}
                        {mapping.used_for_ai && (
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                            AI
                          </span>
                        )}
                        {mapping.is_required && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(mapping)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(mapping.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingMapping ? 'Edit Field Mapping' : 'Add Field Mapping'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetForm();
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Standard Field Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.standardFieldName}
                        onChange={(e) => setFormData({ ...formData, standardFieldName: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                        placeholder="e.g., operations_manager_name"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">Internal identifier</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Standard Field Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.standardFieldLabel}
                        onChange={(e) => setFormData({ ...formData, standardFieldLabel: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                        placeholder="e.g., Operations Manager Name"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">Display name</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Table Name
                      </label>
                      <input
                        type="text"
                        value={formData.tableName}
                        onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono"
                        placeholder="e.g., learners, employers, programmes"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">Database table name</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mapped Field Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.mappedFieldName}
                        onChange={(e) => setFormData({ ...formData, mappedFieldName: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono"
                        placeholder="e.g., OpsMgr_Name, operations_manager"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500 mt-1">Actual field name in database</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Field Type
                      </label>
                      <select
                        value={formData.fieldType}
                        onChange={(e) => setFormData({ ...formData, fieldType: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                        disabled={isSubmitting}
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.isRequired}
                          onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                          className="w-4 h-4 text-[#00e5c0] rounded focus:ring-[#00e5c0]"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-slate-700">Required</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Usage
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.usedForFiltering}
                          onChange={(e) => setFormData({ ...formData, usedForFiltering: e.target.checked })}
                          className="w-4 h-4 text-[#00e5c0] rounded focus:ring-[#00e5c0]"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-slate-700">PowerBI Filtering</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.usedForAi}
                          onChange={(e) => setFormData({ ...formData, usedForAi: e.target.checked })}
                          className="w-4 h-4 text-[#00e5c0] rounded focus:ring-[#00e5c0]"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-slate-700">AI Summaries</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description / Notes
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                      rows={3}
                      placeholder="Optional notes about this field mapping..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex justify-between">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingMapping ? 'Update Mapping' : 'Add Mapping'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
