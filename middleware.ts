/**
 * Next.js Middleware for:
 * 1. Authentication (Custom Auth0 session management)
 * 2. Multi-tenant routing (subdomain detection)
 * 3. Security headers
 * 4. Role-based access control
 */

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = ['/api/auth', '/test-db', '/'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Get session from cookie
  const sessionCookie = request.cookies.get('auth_session')?.value;
  let user = null;

  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(process.env.AUTH0_SECRET);
      const { payload } = await jwtVerify(sessionCookie, secret);
      user = payload;
    } catch (error) {
      // Invalid session - will redirect to login below if needed
    }
  }

  // Redirect to login if not authenticated (except for public paths)
  if (!user && !isPublicPath) {
    const loginUrl = new URL('/api/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Extract subdomain for multi-tenancy
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);

  // Add subdomain and user info to request headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-subdomain', subdomain || '');
  if (user?.sub) {
    requestHeaders.set('x-user-id', user.sub as string);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content Security Policy - Allow Auth0 and PowerBI
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.powerbi.com https://*.auth0.com https://cdn.jsdelivr.net https://cdn.powerbi.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.powerbi.com https://*.auth0.com; frame-src https://app.powerbi.com https://*.auth0.com;"
  );

  // Check super admin access
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  if (isSuperAdminRoute && user) {
    // TODO: Check roles from database
    // For now, allow access
  }

  // Check tenant admin access
  const isTenantAdminRoute = pathname.startsWith('/tenant-admin');
  if (isTenantAdminRoute && user) {
    // TODO: Check roles from database
    // For now, allow access
  }

  return response;
}

/**
 * Extract subdomain from hostname
 * Examples:
 * - demo1.aivii.co.uk → demo1
 * - admin.aivii.co.uk → admin
 * - aivii.co.uk → null
 * - localhost:3000 → null
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // For localhost or IP addresses, no subdomain
  if (hostWithoutPort === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostWithoutPort)) {
    return null;
  }

  const parts = hostWithoutPort.split('.');

  // Need at least 3 parts for subdomain (sub.domain.tld)
  if (parts.length < 3) {
    return null;
  }

  // First part is the subdomain
  return parts[0];
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
