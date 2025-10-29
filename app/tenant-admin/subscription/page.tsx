'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface SubscriptionTier {
  name: string;
  display_name: string;
  max_learners: number;
  price_per_learner: number;
}

interface Subscription {
  subscription_status: string;
  billing_cycle: string;
  current_learner_count: number;
  max_learner_count_this_period: number;
  subscription_starts_at: string | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  subscription_tiers: SubscriptionTier | null;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant-admin/subscription');

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#033c3a]">Subscription</h2>
        <p className="text-slate-600 mt-1">
          View your subscription details and usage
        </p>
      </div>

      {/* Status Alert */}
      {subscription.subscription_status === 'trial' && subscription.trial_ends_at && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-blue-900 font-medium">Trial Period</p>
            <p className="text-blue-800 text-sm">
              Your trial ends on {formatDate(subscription.trial_ends_at)}. Upgrade to continue using the platform.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Status</h3>
            <CreditCard className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <div className="mt-2">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(subscription.subscription_status)}`}>
              {subscription.subscription_status.charAt(0).toUpperCase() + subscription.subscription_status.slice(1)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Current Plan</h3>
            <TrendingUp className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">
            {subscription.subscription_tiers?.display_name || 'No Plan'}
          </p>
          {subscription.subscription_tiers && (
            <p className="text-xs text-slate-500 mt-1">
              Up to {subscription.subscription_tiers.max_learners} learners
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Learners</h3>
            <Users className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">
            {subscription.current_learner_count}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {subscription.subscription_tiers
              ? `of ${subscription.subscription_tiers.max_learners} max`
              : 'current learners'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Next Billing</h3>
            <Calendar className="h-5 w-5 text-[#00e5c0]" />
          </div>
          <p className="text-2xl font-bold text-[#033c3a]">
            {formatDate(subscription.next_billing_date)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {subscription.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'} billing
          </p>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Subscription Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-600">Billing Cycle</label>
            <p className="text-slate-900 mt-1 capitalize">{subscription.billing_cycle}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Peak Learners This Period</label>
            <p className="text-slate-900 mt-1">{subscription.max_learner_count_this_period}</p>
          </div>

          {subscription.subscription_starts_at && (
            <div>
              <label className="text-sm font-medium text-slate-600">Subscription Started</label>
              <p className="text-slate-900 mt-1">{formatDate(subscription.subscription_starts_at)}</p>
            </div>
          )}

          {subscription.subscription_ends_at && (
            <div>
              <label className="text-sm font-medium text-slate-600">Subscription Ends</label>
              <p className="text-slate-900 mt-1">{formatDate(subscription.subscription_ends_at)}</p>
            </div>
          )}

          {subscription.trial_ends_at && (
            <div>
              <label className="text-sm font-medium text-slate-600">Trial Ends</label>
              <p className="text-slate-900 mt-1">{formatDate(subscription.trial_ends_at)}</p>
            </div>
          )}
        </div>

        {subscription.subscription_tiers && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-md font-semibold text-slate-900 mb-3">Pricing</h4>
            <p className="text-slate-600 text-sm">
              £{subscription.subscription_tiers.price_per_learner.toFixed(2)} per learner per {subscription.billing_cycle === 'monthly' ? 'month' : 'year'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
