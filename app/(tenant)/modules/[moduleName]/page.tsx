'use client';

import { use, useEffect, useState } from 'react';
import PowerBIReport from '../../components/PowerBIReport';

interface ModuleTab {
  id: string;
  tab_name: string;
  sort_order: number;
  report_id: string; // PowerBI report ID
  workspace_id: string; // PowerBI workspace ID
  page_name: string | null; // Optional specific page
  template_report_id: string; // Template report ID for embed token lookup
  source: 'global' | 'tenant';
}

export default function ModulePage({
  params,
}: {
  params: Promise<{ moduleName: string }>;
}) {
  const { moduleName } = use(params);
  const [tabs, setTabs] = useState<ModuleTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<ModuleTab | null>(null);

  useEffect(() => {
    fetchTabs();
  }, [moduleName]);

  const fetchTabs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenant/modules/${moduleName}/tabs`);

      if (!response.ok) {
        throw new Error('Failed to load module tabs');
      }

      const data = await response.json();
      setTabs(data);

      // Auto-select first tab
      if (data.length > 0) {
        setSelectedTab(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            No Tabs Configured
          </h2>
          <p className="text-yellow-800">
            There are no tabs configured for this module yet. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Module Tabs (configured in Super Admin) */}
      {tabs.length > 1 && (
        <div className="bg-[#e6ffff] border-b border-[#0eafaa]">
          <div className="px-6 py-2">
            <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-[#0eafaa]/20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
                    selectedTab?.id === tab.id
                      ? 'bg-[#00e5c0] text-[#033c3a] shadow-sm'
                      : 'text-[#033c3a]/70 hover:text-[#033c3a] hover:bg-[#e6ffff]'
                  }`}
                >
                  {tab.tab_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Display */}
      <div className="flex-1">
        {selectedTab ? (
          <PowerBIReport
            reportId={selectedTab.report_id}
            workspaceId={selectedTab.workspace_id}
            reportName={selectedTab.tab_name}
            pageName={selectedTab.page_name}
            templateReportId={selectedTab.template_report_id}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Select a tab to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
