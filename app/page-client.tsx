'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TenantLandingPage() {
  const [organizationName, setOrganizationName] = useState<string>('');
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/tenant/organization');
      if (response.ok) {
        const data = await response.json();
        setOrganizationName(data.name || 'Skills Intelligence System');
        setOrganizationLogo(data.logo_url || null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganizationName('Skills Intelligence System');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        {/* Organization Logo */}
        {organizationLogo && (
          <div className="mb-8">
            <img
              src={organizationLogo}
              alt={organizationName}
              className="h-24 mx-auto object-contain"
            />
          </div>
        )}

        {/* Welcome Message */}
        <h1 className="text-4xl md:text-5xl font-bold text-[#033c3a] mb-4">
          Welcome to {organizationName}'s
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#033c3a] to-[#00e5c0] bg-clip-text text-transparent mb-8">
          Skills Intelligence System
        </h2>

        <p className="text-lg text-slate-600 mb-12 max-w-xl mx-auto">
          Access your personalized dashboard, reports, and insights to track apprenticeship progress and performance.
        </p>

        {/* Sign In Button */}
        <Link
          href="/signin"
          className="inline-block px-10 py-4 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
        >
          Sign In to Continue
        </Link>

        {/* Optional Footer Text */}
        <p className="mt-12 text-sm text-slate-500">
          Secure access powered by Auth0
        </p>
      </div>
    </div>
  );
}
