'use client';

import { Building2, Mail, User } from 'lucide-react';

export default function OrganizationPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#033c3a]">Organization Settings</h2>
        <p className="text-slate-600 mt-1">
          Manage your organization details and configuration
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Organization settings functionality is coming soon. You'll be able to update your organization name, logo, and billing contact information here.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Building2 className="inline h-4 w-4 mr-2" />
              Organization Name
            </label>
            <input
              type="text"
              disabled
              placeholder="Your Organization"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Mail className="inline h-4 w-4 mr-2" />
              Billing Email
            </label>
            <input
              type="email"
              disabled
              placeholder="billing@example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <User className="inline h-4 w-4 mr-2" />
              Billing Contact Name
            </label>
            <input
              type="text"
              disabled
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <button
              disabled
              className="px-6 py-2 bg-slate-300 text-slate-500 rounded-lg cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
