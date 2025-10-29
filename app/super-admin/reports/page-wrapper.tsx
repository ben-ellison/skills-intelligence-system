'use client';

import { useState } from 'react';
import ImprovedReportModal from './ImprovedReportModal';
import Link from 'next/link';

interface PowerBIReport {
  id: string;
  name: string;
  description: string | null;
  powerbi_report_id: string;
  powerbi_workspace_id: string;
  powerbi_dataset_id: string | null;
  category: string | null;
  version: string | null;
  is_active: boolean;
  provider_code?: string | null;
  lms_code?: string | null;
  english_maths_code?: string | null;
  crm_code?: string | null;
  hr_code?: string | null;
  role_name?: string | null;
  report_version?: string | null;
  is_template?: boolean;
  created_at: string;
  updated_at: string;
}

interface ReportsPageWrapperProps {
  initialReports: PowerBIReport[];
}

export default function ReportsPageWrapper({ initialReports }: ReportsPageWrapperProps) {
  const [reports, setReports] = useState<PowerBIReport[]>(initialReports);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<PowerBIReport | null>(null);

  const categoryColors: Record<string, string> = {
    'senior_leader': 'bg-[#e6ffff] text-[#0eafaa]',
    'operations': 'bg-blue-100 text-blue-700',
    'quality': 'bg-green-100 text-green-700',
    'sales': 'bg-orange-100 text-orange-700',
    'general': 'bg-slate-100 text-slate-700',
  };

  const handleAddReport = () => {
    setEditingReport(null);
    setIsModalOpen(true);
  };

  const handleEditReport = (report: PowerBIReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const refreshReports = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                PowerBI Reports Library
              </h1>
              <p className="text-slate-600">
                Manage PowerBI reports that will be assigned to roles
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/super-admin"
                className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back to Portal
              </Link>
              <button
                onClick={handleAddReport}
                className="px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
              >
                + Add Report
              </button>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Reports</h2>

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Reports Yet</h3>
                <p className="text-slate-600 mb-6">
                  Add your first PowerBI report to get started
                </p>
                <button
                  onClick={handleAddReport}
                  className="px-6 py-3 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors"
                >
                  + Add Your First Report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Provider Code</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-slate-500 mt-1">{report.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.provider_code ? (
                            <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold">
                              {report.provider_code}
                            </code>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Universal</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.category && (
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              categoryColors[report.category] || categoryColors.general
                            }`}>
                              {report.category.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {report.is_active ? (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleEditReport(report)}
                            className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                          >
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <ImprovedReportModal
            report={editingReport}
            onClose={() => setIsModalOpen(false)}
            onSuccess={refreshReports}
          />
        )}
      </div>
    </div>
  );
}
