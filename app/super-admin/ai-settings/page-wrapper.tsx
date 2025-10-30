'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Edit2, Plus, Sparkles } from 'lucide-react';

interface SystemSettings {
  id: string;
  azure_openai_endpoint: string | null;
  azure_openai_deployment_name: string | null;
  azure_openai_api_version: string | null;
  ai_enabled: boolean;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
}

interface AIPrompt {
  id: string;
  role_id: string | null;
  prompt_name: string;
  prompt_text: string;
  prompt_type: string;
  is_active: boolean;
  powerbi_report_id: string | null;
  powerbi_page_names: string[];
  created_at: string;
  updated_at: string;
  powerbi_reports?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface PowerBIReport {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface AISettingsPageWrapperProps {
  systemSettings: SystemSettings | null;
  roles: Role[];
  prompts: AIPrompt[];
  powerbiReports: PowerBIReport[];
}

export default function AISettingsPageWrapper({
  systemSettings,
  roles,
  prompts,
  powerbiReports,
}: AISettingsPageWrapperProps) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [creatingPrompt, setCreatingPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportPages, setReportPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    azureEndpoint: systemSettings?.azure_openai_endpoint || '',
    deploymentName: systemSettings?.azure_openai_deployment_name || '',
    apiVersion: systemSettings?.azure_openai_api_version || '2024-02-15-preview',
    aiEnabled: systemSettings?.ai_enabled || false,
  });

  const [promptForm, setPromptForm] = useState({
    roleId: '',
    promptName: '',
    promptText: '',
    promptType: 'daily_summary',
    isActive: true,
    powerbiReportId: '',
    powerbiPageNames: [] as string[],
  });

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/super-admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          ...settingsForm,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      alert('Settings saved successfully!');
      setEditingSettings(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/super-admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingPrompt ? 'update_prompt' : 'create_prompt',
          promptId: editingPrompt?.id,
          ...promptForm,
        }),
      });

      if (!response.ok) throw new Error('Failed to save prompt');

      alert('Prompt saved successfully!');
      setEditingPrompt(null);
      setCreatingPrompt(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const fetchReportPages = async (reportId: string) => {
    if (!reportId) {
      setReportPages([]);
      return;
    }

    setLoadingPages(true);
    try {
      const response = await fetch(`/api/super-admin/powerbi/reports/${reportId}/pages`);
      if (response.ok) {
        const data = await response.json();
        const sortedPages = (data.pages || []).sort((a: any, b: any) =>
          (a.displayName || a.name).localeCompare(b.displayName || b.name)
        );
        setReportPages(sortedPages);
      } else {
        setReportPages([]);
      }
    } catch (error) {
      console.error('Failed to fetch report pages:', error);
      setReportPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleReportChange = (reportId: string) => {
    setPromptForm({ ...promptForm, powerbiReportId: reportId, powerbiPageNames: [] });
    fetchReportPages(reportId);
  };

  const handlePageToggle = (pageName: string) => {
    const currentPages = promptForm.powerbiPageNames;
    if (currentPages.includes(pageName)) {
      setPromptForm({
        ...promptForm,
        powerbiPageNames: currentPages.filter(p => p !== pageName)
      });
    } else {
      setPromptForm({
        ...promptForm,
        powerbiPageNames: [...currentPages, pageName]
      });
    }
  };

  const openEditPrompt = async (prompt: AIPrompt) => {
    setEditingPrompt(prompt);
    setPromptForm({
      roleId: prompt.role_id || '',
      promptName: prompt.prompt_name,
      promptText: prompt.prompt_text,
      promptType: prompt.prompt_type,
      isActive: prompt.is_active,
      powerbiReportId: prompt.powerbi_report_id || '',
      powerbiPageNames: prompt.powerbi_page_names || [],
    });

    // Fetch pages for the selected report
    if (prompt.powerbi_report_id) {
      await fetchReportPages(prompt.powerbi_report_id);
    }
  };

  const openCreatePrompt = () => {
    setCreatingPrompt(true);
    setPromptForm({
      roleId: '',
      promptName: '',
      promptText: '',
      promptType: 'daily_summary',
      isActive: true,
      powerbiReportId: '',
      powerbiPageNames: [],
    });
    setReportPages([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Link
          href="/super-admin"
          className="inline-flex items-center text-sm text-slate-600 hover:text-[#033c3a] mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Super Admin Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="h-8 w-8 text-[#00e5c0]" />
          <div>
            <h1 className="text-3xl font-bold text-[#033c3a]">AI Settings</h1>
            <p className="text-slate-600">Configure Azure OpenAI and manage role-based prompts</p>
          </div>
        </div>

        {/* Azure OpenAI Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Azure OpenAI Configuration</h2>
            {!editingSettings && (
              <button
                onClick={() => setEditingSettings(true)}
                className="flex items-center px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}
          </div>

          {editingSettings ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Azure OpenAI Endpoint
                </label>
                <input
                  type="text"
                  value={settingsForm.azureEndpoint}
                  onChange={(e) => setSettingsForm({ ...settingsForm, azureEndpoint: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="https://your-resource.openai.azure.com/"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Deployment Name
                </label>
                <input
                  type="text"
                  value={settingsForm.deploymentName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deploymentName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                  placeholder="gpt-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  API Version
                </label>
                <input
                  type="text"
                  value={settingsForm.apiVersion}
                  onChange={(e) => setSettingsForm({ ...settingsForm, apiVersion: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settingsForm.aiEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, aiEnabled: e.target.checked })}
                    className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                  />
                  <span className="ml-2 text-sm text-slate-700">Enable AI Features</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  onClick={() => setEditingSettings(false)}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Endpoint:</span>
                <span className="font-mono text-slate-900">{systemSettings?.azure_openai_endpoint || 'Not configured'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Deployment:</span>
                <span className="font-mono text-slate-900">{systemSettings?.azure_openai_deployment_name || 'Not configured'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">API Version:</span>
                <span className="font-mono text-slate-900">{systemSettings?.azure_openai_api_version || 'Not configured'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${systemSettings?.ai_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {systemSettings?.ai_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* AI Prompts Management */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Role-Based Prompts</h2>
            <button
              onClick={openCreatePrompt}
              className="flex items-center px-4 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </button>
          </div>

          <div className="space-y-4">
            {prompts.map((prompt) => {
              const role = roles.find((r) => r.id === prompt.role_id);
              const report = prompt.powerbi_reports;
              return (
                <div key={prompt.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{prompt.prompt_name}</h3>
                      <p className="text-sm text-slate-600">Role: {role?.display_name || 'All Roles'}</p>
                      {report && (
                        <div className="mt-1 text-xs text-slate-500">
                          <span className="font-medium">Report:</span> {report.name}
                          {prompt.powerbi_page_names && prompt.powerbi_page_names.length > 0 && (
                            <span className="ml-2">
                              ({prompt.powerbi_page_names.length} page{prompt.powerbi_page_names.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => openEditPrompt(prompt)}
                      className="flex items-center px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{prompt.prompt_text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit/Create Prompt Modal */}
        {(editingPrompt || creatingPrompt) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Role
                    </label>
                    <select
                      value={promptForm.roleId}
                      onChange={(e) => setPromptForm({ ...promptForm, roleId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                    >
                      <option value="">All Roles</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Prompt Name
                    </label>
                    <input
                      type="text"
                      value={promptForm.promptName}
                      onChange={(e) => setPromptForm({ ...promptForm, promptName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                      placeholder="Daily Summary for Senior Leader"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Prompt Text
                      <span className="text-xs text-slate-500 ml-2">
                        Use {'{priorities_data}'} as a placeholder for the data
                      </span>
                    </label>
                    <textarea
                      value={promptForm.promptText}
                      onChange={(e) => setPromptForm({ ...promptForm, promptText: e.target.value })}
                      rows={12}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent font-mono text-sm"
                      placeholder="You are an AI assistant helping a [role] in an apprenticeship training organization..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      PowerBI Report (Optional)
                      <span className="text-xs text-slate-500 ml-2">
                        Select a report to automatically extract data for AI analysis
                      </span>
                    </label>
                    <select
                      value={promptForm.powerbiReportId}
                      onChange={(e) => handleReportChange(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00e5c0] focus:border-transparent"
                    >
                      <option value="">No report (use manual data)</option>
                      {powerbiReports.map((report) => (
                        <option key={report.id} value={report.id}>
                          {report.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {promptForm.powerbiReportId && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Pages to Analyze
                        <span className="text-xs text-slate-500 ml-2">
                          {loadingPages ? 'Loading pages...' : 'Select one or more pages'}
                        </span>
                      </label>
                      {loadingPages ? (
                        <div className="text-sm text-slate-500 p-4">Loading pages...</div>
                      ) : reportPages.length > 0 ? (
                        <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                          {reportPages.map((page: any) => (
                            <label key={page.name} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={promptForm.powerbiPageNames.includes(page.name)}
                                onChange={() => handlePageToggle(page.name)}
                                className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                              />
                              <span className="ml-2 text-sm text-slate-700">
                                {page.displayName || page.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 p-4 border border-slate-300 rounded-lg">
                          No pages found in this report
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={promptForm.isActive}
                        onChange={(e) => setPromptForm({ ...promptForm, isActive: e.target.checked })}
                        className="rounded text-[#00e5c0] focus:ring-[#00e5c0]"
                      />
                      <span className="ml-2 text-sm text-slate-700">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSavePrompt}
                      disabled={saving}
                      className="flex items-center px-6 py-2 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Prompt'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPrompt(null);
                        setCreatingPrompt(false);
                      }}
                      className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
