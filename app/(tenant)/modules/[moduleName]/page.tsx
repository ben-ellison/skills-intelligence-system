'use client';

import { use, useEffect, useState } from 'react';
import PowerBIReport from '../../components/PowerBIReport';

interface Report {
  id: string;
  powerbi_report_id: string;
  custom_display_name: string;
  powerbi_workspace_id: string;
}

export default function ModulePage({
  params,
}: {
  params: Promise<{ moduleName: string }>;
}) {
  const { moduleName } = use(params);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, [moduleName]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenant/modules/${moduleName}/reports`);

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = await response.json();
      setReports(data);

      // Auto-select first report
      if (data.length > 0) {
        setSelectedReport(data[0]);
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
          <p className="mt-4 text-slate-600">Loading reports...</p>
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

  if (reports.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            No Reports Available
          </h2>
          <p className="text-yellow-800">
            There are no reports configured for this module yet. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Report Tabs */}
      {reports.length > 1 && (
        <div className="bg-[#e6ffff] border-b border-[#0eafaa]">
          <div className="px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    selectedReport?.id === report.id
                      ? 'border-[#00e5c0] text-[#033c3a] bg-white'
                      : 'border-transparent text-[#033c3a]/70 hover:text-[#033c3a] hover:bg-[#00f9e3]/20'
                  }`}
                >
                  {report.custom_display_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Display */}
      <div className="flex-1">
        {selectedReport ? (
          <PowerBIReport
            reportId={selectedReport.powerbi_report_id}
            workspaceId={selectedReport.powerbi_workspace_id}
            reportName={selectedReport.custom_display_name}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Select a report to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
