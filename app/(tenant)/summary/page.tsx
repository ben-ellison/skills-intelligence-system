'use client';

import { useState } from 'react';
import PowerBIReport from '../components/PowerBIReport';

export default function SummaryPage() {
  const [activeTab, setActiveTab] = useState<'powerbi' | 'ai'>('powerbi');

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
              Executive Dashboard
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'ai'
                  ? 'border-[#00e5c0] text-[#033c3a] bg-white'
                  : 'border-transparent text-[#033c3a]/70 hover:text-[#033c3a] hover:bg-[#00f9e3]/20'
              }`}
            >
              AI Summary & Priorities
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'powerbi' ? (
          <PowerBIReportTab />
        ) : (
          <AISummaryTab />
        )}
      </div>
    </div>
  );
}

function PowerBIReportTab() {
  // TODO: Configure which PowerBI report to show here
  // For now, showing a placeholder until you configure the report
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Configure Executive Dashboard
        </h3>
        <p className="text-blue-800 mb-4">
          To display a PowerBI report here, you need to:
        </p>
        <ol className="list-decimal list-inside text-blue-800 space-y-2">
          <li>Create a PowerBI report in the Reports Library</li>
          <li>Deploy it to this organization</li>
          <li>Configure the report ID and workspace ID in this component</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-sm text-blue-900">
            <strong>Example usage:</strong> Replace the PowerBIReportTab content with:
          </p>
          <code className="text-xs text-blue-900 block mt-2">
            {`<PowerBIReport
  reportId="your-report-id"
  workspaceId="your-workspace-id"
  reportName="Executive Dashboard"
  templateReportId="template-id"
/>`}
          </code>
        </div>
      </div>
    </div>
  );
}

function AISummaryTab() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          AI Summary & Priorities
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
