'use client';

import Link from 'next/link';

export default function SignOutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <svg className="w-20 h-20 mx-auto text-[#00e5c0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#033c3a] mb-2">You've been signed out</h1>
        <p className="text-slate-600 mb-8">Thanks for using Skills Intelligence System</p>

        <Link
          href="/signin"
          className="inline-block px-8 py-3 bg-[#00e5c0] text-white rounded-lg hover:bg-[#0eafaa] transition-colors font-medium"
        >
          Sign In Again
        </Link>
      </div>
    </div>
  );
}
