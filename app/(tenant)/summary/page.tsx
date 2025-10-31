'use client';

import { useState, useEffect } from 'react';
import PowerBIReport from '../components/PowerBIReport';
import ReactMarkdown from 'react-markdown';

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
      <div className="flex justify-center py-3">
        <div className="inline-flex bg-[#00e5c0] rounded-lg p-1 ml-8">
          <button
            onClick={() => setActiveTab('powerbi')}
            className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
              activeTab === 'powerbi'
                ? 'bg-[#033c3a] text-[#e6ffff]'
                : 'text-[#033c3a] hover:bg-[#033c3a]/10'
            }`}
          >
            Immediate Priorities
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
              activeTab === 'ai'
                ? 'bg-[#033c3a] text-[#e6ffff]'
                : 'text-[#033c3a] hover:bg-[#033c3a]/10'
            }`}
          >
            AiVII Summary
          </button>
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
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Load latest summary from database on mount
  useEffect(() => {
    loadLatestSummary();
  }, []);

  const loadLatestSummary = async () => {
    try {
      setLoadingInitial(true);
      const response = await fetch('/api/ai-summaries/latest');
      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setSummary(data.summary.summary_text);
          setLastGenerated(new Date(data.summary.created_at).toLocaleString());
        }
      }
    } catch (err) {
      console.error('Error loading latest summary:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      // Dynamic import of client-side extraction library
      const { extractPowerBIDataClient } = await import('@/lib/powerbi/extract-data-client');

      // Get priority report info
      const priorityResponse = await fetch('/api/tenant/priority-report');
      const priorityData = await priorityResponse.json();

      if (!priorityData.hasRole || !priorityData.hasPriorityReport || !priorityData.report) {
        setError('Cannot generate summary: No priority report available for your role');
        setLoading(false);
        return;
      }

      console.log('[AI Summary] Getting embed token for report:', priorityData.report.templateReportId);

      // Get PowerBI embed token
      const embedTokenResponse = await fetch('/api/powerbi/embed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateReportId: priorityData.report.templateReportId
        })
      });

      if (!embedTokenResponse.ok) {
        const embedError = await embedTokenResponse.json();
        setError(`Failed to get PowerBI access: ${embedError.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const embedData = await embedTokenResponse.json();
      console.log('[AI Summary] Got embed token, extracting PowerBI data...');
      console.log('[AI Summary] Embed data:', {
        hasAccessToken: !!embedData.accessToken,
        hasEmbedUrl: !!embedData.embedUrl,
        reportId: priorityData.report.reportId
      });

      // Extract real PowerBI data client-side using the SDK (same as working portal)
      const extractionResult = await extractPowerBIDataClient(
        embedData.accessToken,
        priorityData.report.reportId,
        embedData.embedUrl,
        [] // Extract from all pages
      );

      if (!extractionResult.success) {
        setError(`PowerBI data extraction failed: ${extractionResult.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      console.log(`[AI Summary] Extracted ${extractionResult.visuals.length} visuals from ${extractionResult.pageCount} pages`);

      // Get user role ID for prompt lookup
      const userResponse = await fetch('/api/tenant/user-info');
      const userData = await userResponse.json();

      if (!userData.roleId) {
        setError('Cannot generate summary: No role assigned');
        setLoading(false);
        return;
      }

      // Send extracted data to server for AI analysis
      const summaryResponse = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: userData.roleId,
          prioritiesData: {
            source: 'powerbi_visuals_client',
            reportName: priorityData.report.name,
            visuals: extractionResult.visuals,
            pageCount: extractionResult.pageCount,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json();
        console.error('Summary API error:', errorData);
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const result = await summaryResponse.json();
      console.log('[AI Summary] Generated successfully with real PowerBI data');
      setSummary(result.summary);
      setLastGenerated(new Date().toLocaleString());
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(err.message || 'An error occurred while generating the summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              AiVII Summary
            </h2>
            {lastGenerated && (
              <p className="text-sm text-slate-500 mt-1">
                Last generated: {lastGenerated}
              </p>
            )}
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              loading
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#00e5c0] text-[#033c3a] hover:bg-[#0eafaa]'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#033c3a]"></div>
                Generating...
              </span>
            ) : (
              'Generate AI Summary'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loadingInitial && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0]"></div>
          </div>
        )}

        {!summary && !error && !loading && !loadingInitial && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <svg
              className="w-16 h-16 text-blue-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Generate Your AI Summary
            </h3>
            <p className="text-blue-800 mb-4">
              Click the button above to generate an AI-powered summary of your immediate priorities.
              The AI will analyze your data and provide actionable insights tailored to your role.
            </p>
          </div>
        )}

        {summary && (
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b-2 border-slate-300 first:mt-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 space-y-2" {...props} />,
                  li: ({node, ...props}) => <li className="text-slate-700 leading-relaxed" {...props} />,
                  p: ({node, ...props}) => <p className="text-slate-700 leading-relaxed mb-4" {...props} />
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
