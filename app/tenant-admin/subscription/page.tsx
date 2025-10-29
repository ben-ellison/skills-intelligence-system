'use client';

import { CreditCard, Calendar, Users, TrendingUp } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#033c3a]">Subscription</h2>
        <p className="text-slate-600 mt-1">
          View your subscription details and usage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Status</h3>
            <CreditCard className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">Trial</p>
          <p className="text-xs text-slate-500 mt-1">Active subscription</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Current Plan</h3>
            <TrendingUp className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">Starter</p>
          <p className="text-xs text-slate-500 mt-1">Up to 100 learners</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Learners</h3>
            <Users className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">0</p>
          <p className="text-xs text-slate-500 mt-1">of 100 max</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Next Billing</h3>
            <Calendar className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">--</p>
          <p className="text-xs text-slate-500 mt-1">Trial period</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            Full subscription management functionality is coming soon. You'll be able to view detailed usage, upgrade your plan, and manage billing here.
          </p>
        </div>
      </div>
    </div>
  );
}
