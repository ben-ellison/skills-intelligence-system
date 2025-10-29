'use client';

import { useState, useEffect } from 'react';
import PowerBIReport from '../components/PowerBIReport';

interface PriorityReportData {
  hasRole: boolean;
  roleName?: string;
  hasPriorityReport?: boolean;
  isDeployed?: boolean;
  message?: string;
  report?: {
    id: string;
    name: string;
    reportId: string;
    workspaceId: string;
    templateReportId: string;
  };
}

export default function SummaryPage() {
  const [activeTab, setActiveTab] = useState<'powerbi' | 'ai'>('powerbi');
  const [priorityData, setPriorityData] = useState<PriorityReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriorityReport();
  }, []);

  const fetchPriorityReport = async () => {
    try {
      const response = await fetch('/api/tenant/priority-report');
      const data = await response.json();
      setPriorityData(data);
    } catch (error) {
      console.error('Error fetching priority report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-[#e6ffff] border-b border-[#0eafaa]">
        <div className="px-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('powerbi')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'powerbi'
                  ? 'border-[#00e5c0] text-[#033c3a] bg-white'
                  : 'border-transparent text-[#033c3a]/70 hover:text-[#033c3a] hover:bg-[#00f9e3]/20'
              }`}
            >
              Immediate Priorities
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'ai'
                  ? 'border-[#00e5c0] text-[#033c3a] bg-white'
                  : 'border-transparent text-[#033c3a]/70 hover:text-[#033c3a] hover:bg-[#00f9e3]/20'
              }`}
            >
              AiVII Summary
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'powerbi' ? (
          <PowerBIReportTab loading={loading} priorityData={priorityData} />
        ) : (
          <AISummaryTab />
        )}
      </div>
    </div>
  );
}

function PowerBIReportTab({ loading, priorityData }: { loading: boolean; priorityData: PriorityReportData | null }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your Immediate Priorities...</p>
        </div>
      </div>
    );
  }

  if (!priorityData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Report</h3>
          <p className="text-red-800">Unable to load your Immediate Priorities report. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (!priorityData.hasRole) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">No Role Assigned</h3>
          <p className="text-amber-800">{priorityData.message || 'You do not have a role assigned yet. Please contact your administrator.'}</p>
        </div>
      </div>
    );
  }

  if (!priorityData.hasPriorityReport) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">No Priority Report Configured</h3>
          <p className="text-blue-800">{priorityData.message || `No Immediate Priorities report configured for your role.`}</p>
        </div>
      </div>
    );
  }

  if (!priorityData.isDeployed || !priorityData.report) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Report Not Deployed</h3>
          <p className="text-amber-800">{priorityData.message || 'Your Immediate Priorities report has not been deployed to this organization yet.'}</p>
        </div>
      </div>
    );
  }

  // Success! Display the PowerBI report
  return (
    <PowerBIReport
      reportId={priorityData.report.reportId}
      workspaceId={priorityData.report.workspaceId}
      reportName={priorityData.report.name}
      templateReportId={priorityData.report.templateReportId}
    />
  );
}

function AISummaryTab() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          AiVII Summary
        </h2>

        <div className="space-y-6">
          {/* Placeholder content */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              🚧 AI Summary Coming Soon
            </h3>
            <p className="text-amber-800">
              This tab will display AI-generated summaries and priorities based on your
              organization's data across all modules.
            </p>
          </div>

          {/* Placeholder sections for what will be shown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Key Insights</h4>
              <p className="text-sm text-slate-600">
                AI-generated insights from your data will appear here
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Top Priorities</h4>
              <p className="text-sm text-slate-600">
                Prioritized action items based on AI analysis
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Trends & Patterns</h4>
              <p className="text-sm text-slate-600">
                Identified trends across your modules
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Recommendations</h4>
              <p className="text-sm text-slate-600">
                AI-powered recommendations for improvement
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
