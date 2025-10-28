'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Report {
  id: string;
  name: string;
}

interface Module {
  name: string;
  display_name: string;
}

interface CreateTabModalProps {
  reports: Report[];
  modules: Module[];
  onClose: () => void;
  onTabCreated: (tab: any) => void;
}

export default function CreateTabModal({ reports, modules, onClose, onTabCreated }: CreateTabModalProps) {
  const [formData, setFormData] = useState({
    module_name: '',
    tab_name: '',
    sort_order: 0,
    report_id: '',
    page_name: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/super-admin/module-tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_name: formData.module_name,
          tab_name: formData.tab_name,
          sort_order: formData.sort_order,
          report_id: formData.report_id,
          page_name: formData.page_name || null,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tab');
      }

      const newTab = await response.json();
      onTabCreated(newTab);
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
          <h2 className="text-xl font-semibold text-[#033c3a]">Create New Module Tab</h2>
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

          {/* Module Selection */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Module *
            </label>
            <select
              value={formData.module_name}
              onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
              required
            >
              <option value="">Select a module...</option>
              {modules.map(module => (
                <option key={module.name} value={module.name}>
                  {module.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Name */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Tab Name *
            </label>
            <input
              type="text"
              value={formData.tab_name}
              onChange={(e) => setFormData({ ...formData, tab_name: e.target.value })}
              placeholder="e.g., Overview, KPIs, Trends"
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
              required
            />
            <p className="mt-1 text-sm text-[#033c3a]/60">
              This name will appear on the tab for all tenants
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
              Lower numbers appear first (0 = leftmost tab)
            </p>
          </div>

          {/* Report Selection */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              PowerBI Report *
            </label>
            <select
              value={formData.report_id}
              onChange={(e) => setFormData({ ...formData, report_id: e.target.value })}
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
              required
            >
              <option value="">Select a report...</option>
              {reports.map(report => (
                <option key={report.id} value={report.id}>
                  {report.name}
                </option>
              ))}
            </select>
          </div>

          {/* Page Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-[#033c3a] mb-2">
              Specific Page (Optional)
            </label>
            <input
              type="text"
              value={formData.page_name}
              onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
              placeholder="e.g., ReportSection1234"
              className="w-full px-4 py-2 border border-[#0eafaa]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00e5c0]"
            />
            <p className="mt-1 text-sm text-[#033c3a]/60">
              Leave blank to show the first page. Use the page name from PowerBI (e.g., "ReportSection1234")
            </p>
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
              Active (visible to tenants)
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
              {loading ? 'Creating...' : 'Create Tab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
