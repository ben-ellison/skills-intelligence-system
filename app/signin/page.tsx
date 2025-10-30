'use client';

import { useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const signedOut = searchParams.get('signedOut') === 'true';

  useEffect(() => {
    // If user just signed out, wait 2 seconds before redirecting
    if (signedOut) {
      const timer = setTimeout(() => {
        signIn('auth0', { callbackUrl });
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      // Automatically redirect to Auth0 without showing provider selection
      signIn('auth0', { callbackUrl });
    }
  }, [callbackUrl, signedOut]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {signedOut ? (
          <>
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-[#00e5c0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#033c3a] mb-2">You've been signed out</h1>
            <p className="text-slate-600 mb-6">Thanks for using Skills Intelligence System</p>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5c0] mb-2"></div>
            <p className="text-sm text-slate-500">Redirecting to sign in...</p>
          </>
        ) : (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mb-4"></div>
            <p className="text-[#033c3a] text-lg">Redirecting to sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mb-4"></div>
          <p className="text-[#033c3a] text-lg">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
