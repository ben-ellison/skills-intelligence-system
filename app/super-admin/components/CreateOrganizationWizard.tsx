'use client';

import { useState } from 'react';

interface IntegrationProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  description: string | null;
  logo_url: string | null;
}

interface CreateOrganizationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  integrationProviders: IntegrationProvider[];
}

export default function CreateOrganizationWizard({
  isOpen,
  onClose,
  onSuccess,
  integrationProviders,
}: CreateOrganizationWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    lmsProviderId: '',
    englishMathsProviderId: '',
    crmProviderId: '',
    hrProviderId: '',
    powerbiWorkspaceId: '',
    powerbiWorkspaceName: '',
    billingEmail: '',
    billingContactName: '',
  });

  if (!isOpen) return null;

  // Group providers by type
  const lmsProviders = integrationProviders.filter(p => p.provider_type === 'lms');
  const englishMathsProviders = integrationProviders.filter(p => p.provider_type === 'english_maths');
  const crmProviders = integrationProviders.filter(p => p.provider_type === 'crm');
  const hrProviders = integrationProviders.filter(p => p.provider_type === 'hr');

  // Get selected providers for review
  const selectedLms = lmsProviders.find(p => p.id === formData.lmsProviderId);
  const selectedEnglishMaths = englishMathsProviders.find(p => p.id === formData.englishMathsProviderId);
  const selectedCrm = crmProviders.find(p => p.id === formData.crmProviderId);
  const selectedHr = hrProviders.find(p => p.id === formData.hrProviderId);

  const handleNext = () => {
    setError(null);

    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Organization name is required');
        return;
      }
      if (!formData.subdomain.trim()) {
        setError('Subdomain is required');
        return;
      }
      const subdomainRegex = /^[a-z0-9-]+$/;
      if (!subdomainRegex.test(formData.subdomain)) {
        setError('Subdomain must contain only lowercase letters, numbers, and hyphens');
        return;
      }
    }

    if (step === 2) {
      if (!formData.lmsProviderId) {
        setError('Please select an LMS provider (required)');
        return;
      }
    }

    if (step === 3) {
      if (!formData.powerbiWorkspaceId.trim()) {
        setError('PowerBI Workspace ID is required');
        return;
      }
      if (!formData.powerbiWorkspaceName.trim()) {
        setError('Workspace Name is required');
        return;
      }
      // Basic GUID format validation
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRegex.test(formData.powerbiWorkspaceId)) {
        setError('PowerBI Workspace ID must be a valid GUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Success!
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      name: '',
      subdomain: '',
      lmsProviderId: '',
      englishMathsProviderId: '',
      crmProviderId: '',
      hrProviderId: '',
      powerbiWorkspaceId: '',
      powerbiWorkspaceName: '',
      billingEmail: '',
      billingContactName: '',
    });
    setError(null);
    onClose();
  };

  const ProviderSelector = ({
    title,
    providers,
    selectedId,
    onChange,
    required = false
  }: {
    title: string;
    providers: IntegrationProvider[];
    selectedId: string;
    onChange: (id: string) => void;
    required?: boolean;
  }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">
        {title} {required && <span className="text-red-500">*</span>}
      </h4>
      <div className="grid grid-cols-1 gap-3">
        {providers.length === 0 ? (
          <div className="text-sm text-slate-500 italic">No providers available</div>
        ) : (
          <>
            {!required && (
              <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-slate-300 bg-slate-50">
                <input
                  type="radio"
                  name={title}
                  value=""
                  checked={selectedId === ''}
                  onChange={() => onChange('')}
                  className="mr-3 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-slate-600">None</span>
              </label>
            )}
            {providers.map(provider => (
              <label
                key={provider.id}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedId === provider.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name={title}
                  value={provider.id}
                  checked={selectedId === provider.id}
                  onChange={() => onChange(provider.id)}
                  className="mt-1 mr-3 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{provider.display_name}</div>
                  {provider.description && (
                    <div className="text-sm text-slate-600 mt-1">{provider.description}</div>
                  )}
                </div>
              </label>
            ))}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Create New Organization</h2>
              <p className="text-sm text-slate-600 mt-1">Step {step} of 4</p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 flex-1 rounded ${
                  s <= step ? 'bg-purple-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Basic Information
                </h3>
                <p className="text-slate-600 mb-6">
                  Enter the organization details to get started.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Acme Training Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subdomain *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="acme"
                  />
                  <span className="text-slate-600 text-sm">.skillsintelligencesystem.co.uk</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Integration Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Select Integrations
                </h3>
                <p className="text-slate-600 mb-6">
                  Choose which systems this organization will integrate with. LMS is required.
                </p>
              </div>

              <ProviderSelector
                title="LMS Platform"
                providers={lmsProviders}
                selectedId={formData.lmsProviderId}
                onChange={id => setFormData({ ...formData, lmsProviderId: id })}
                required
              />

              <ProviderSelector
                title="English & Maths Assessment"
                providers={englishMathsProviders}
                selectedId={formData.englishMathsProviderId}
                onChange={id => setFormData({ ...formData, englishMathsProviderId: id })}
              />

              <ProviderSelector
                title="CRM System"
                providers={crmProviders}
                selectedId={formData.crmProviderId}
                onChange={id => setFormData({ ...formData, crmProviderId: id })}
              />

              <ProviderSelector
                title="HR / Payroll System"
                providers={hrProviders}
                selectedId={formData.hrProviderId}
                onChange={id => setFormData({ ...formData, hrProviderId: id })}
              />
            </div>
          )}

          {/* Step 3: PowerBI Workspace Configuration */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  PowerBI Workspace
                </h3>
                <p className="text-slate-600 mb-6">
                  Enter the PowerBI workspace details for this organization. This workspace will contain all their reports and dashboards.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PowerBI Workspace ID *
                </label>
                <input
                  type="text"
                  value={formData.powerbiWorkspaceId}
                  onChange={e => setFormData({ ...formData, powerbiWorkspaceId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                />
                <p className="text-xs text-slate-500 mt-1">
                  The unique GUID identifier for the PowerBI workspace
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={formData.powerbiWorkspaceName}
                  onChange={e => setFormData({ ...formData, powerbiWorkspaceName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., fws_demo1_prod"
                />
                <p className="text-xs text-slate-500 mt-1">
                  The human-readable name of the workspace
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Where to find this information:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Open PowerBI Service (app.powerbi.com)</li>
                      <li>Navigate to the workspace</li>
                      <li>Check the URL for the workspace ID (the GUID in the URL)</li>
                      <li>The workspace name is shown in the left sidebar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Billing & Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Billing Contact & Review
                </h3>
                <p className="text-slate-600 mb-6">
                  Add billing contact information and review your configuration.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Billing Contact Name
                </label>
                <input
                  type="text"
                  value={formData.billingContactName}
                  onChange={e => setFormData({ ...formData, billingContactName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={formData.billingEmail}
                  onChange={e => setFormData({ ...formData, billingEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="billing@example.com"
                />
              </div>

              {/* Review Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-slate-900">Review</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Organization:</span>
                    <p className="font-medium text-slate-900">{formData.name}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">Subdomain:</span>
                    <p className="font-medium text-slate-900">{formData.subdomain}.skillsintelligencesystem.co.uk</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">PowerBI Workspace:</span>
                    <p className="font-medium text-slate-900">{formData.powerbiWorkspaceName}</p>
                    <p className="font-mono text-xs text-slate-600 mt-1">{formData.powerbiWorkspaceId}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <span className="text-slate-600 text-sm block mb-2">Integrations:</span>
                  <div className="space-y-2">
                    {selectedLms && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded">
                          LMS
                        </span>
                        <span className="text-sm text-slate-900">{selectedLms.display_name}</span>
                      </div>
                    )}
                    {selectedEnglishMaths && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded">
                          English & Maths
                        </span>
                        <span className="text-sm text-slate-900">{selectedEnglishMaths.display_name}</span>
                      </div>
                    )}
                    {selectedCrm && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                          CRM
                        </span>
                        <span className="text-sm text-slate-900">{selectedCrm.display_name}</span>
                      </div>
                    )}
                    {selectedHr && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded">
                          HR
                        </span>
                        <span className="text-sm text-slate-900">{selectedHr.display_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between">
          <button
            onClick={step === 1 ? handleClose : handleBack}
            disabled={isSubmitting}
            className="px-6 py-2 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
