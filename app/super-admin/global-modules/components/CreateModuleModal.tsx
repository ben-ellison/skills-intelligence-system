'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateModuleModalProps {
  onClose: () => void;
  onModuleCreated: (module: any) => void;
}

const LUCIDE_ICONS = [
  'User', 'Wrench', 'CheckSquare', 'FileText', 'TrendingUp',
  'BarChart3', 'FileBarChart', 'Coins', 'Settings', 'Users',
  'Building', 'BookOpen', 'Calendar', 'Shield', 'Award',
];

const MODULE_GROUPS = [
  { value: 'core', label: 'Core Modules' },
  { value: 'analysis', label: 'Analysis & Reporting' },
  { value: 'admin', label: 'Administration' },
];

export default function CreateModuleModal({ onClose, onModuleCreated }: CreateModuleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    icon_name: '',
    module_group: 'core',
    sort_order: 0,
    description: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/super-admin/global-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          display_name: formData.display_name,
          icon_name: formData.icon_name || null,
          module_group: formData.module_group || null,
          sort_order: formData.sort_order,
          description: formData.description || null,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create module');
      }

      const newModule = await response.json();
      onModuleCreated(newModule);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0eafaa]/20">
          <h2 className="text-xl font-semibold text-[#033c3a]">Create New Global Module</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#e6ffff] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#033c3a]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Module ID (name) */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Module ID *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., operations, quality, senior-leader"
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
              required
            />
            <p className="mt-1 text-sm text-[#033c3a]/60">
              Unique identifier (lowercase, hyphens only)
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g., Operations, Quality & Curriculum"
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
              required
            />
            <p className="mt-1 text-sm text-[#033c3a]/60">
              Name shown in the sidebar
            </p>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Icon (Lucide React)
            </label>
            <select
              value={formData.icon_name}
              onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
            >
              <option value="">No icon</option>
              {LUCIDE_ICONS.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>

          {/* Module Group */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Module Group
            </label>
            <select
              value={formData.module_group}
              onChange={(e) => setFormData({ ...formData, module_group: e.target.value })}
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
            >
              {MODULE_GROUPS.map(group => (
                <option key={group.value} value={group.value}>{group.label}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-[#033c3a]/60">
              Groups modules into collapsible sections
            </p>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Sort Order *
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              min="0"
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
              required
            />
            <p className="mt-1 text-sm text-[#033c3a]/60">
              Lower numbers appear first (0 = top)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Internal description for admin reference"
              rows={3}
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-[#00e5c0] border-[#0eafaa]/30 rounded focus:ring-[#00e5c0]"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-[#033c3a]">
              Active (visible to all tenants)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[#0eafaa]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#033c3a] hover:bg-[#e6ffff] rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#00e5c0] text-[#033c3a] rounded-lg hover:bg-[#0eafaa] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
