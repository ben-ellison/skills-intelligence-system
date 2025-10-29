'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    // Automatically redirect to Auth0 without showing provider selection
    signIn('auth0', { callbackUrl });
  }, [callbackUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6ffff] via-white to-[#00f9e3]/10 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mb-4"></div>
        <p className="text-[#033c3a] text-lg">Redirecting to sign in...</p>
      </div>
    </div>
  );
}
