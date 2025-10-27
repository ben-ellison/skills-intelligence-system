import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

/**
 * Auth0 User Session Interface
 */
export interface Auth0User {
  sub: string; // Auth0 user ID
  email: string;
  name?: string;
  picture?: string;
  org_id?: string; // Custom claim for organization ID
  roles?: string[]; // Custom claim for roles
}

/**
 * Get the current authenticated user from Auth0 session
 * Use this in Server Components and Route Handlers
 */
export async function getAuth0User(): Promise<Auth0User | null> {
  const session = await getSession();
  if (!session?.user) return null;

  return session.user as Auth0User;
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: Auth0User | null, role: string): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(role);
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(user: Auth0User | null): boolean {
  return hasRole(user, 'Super Admin');
}

/**
 * Check if user is a tenant admin
 */
export function isTenantAdmin(user: Auth0User | null): boolean {
  return hasRole(user, 'Tenant Admin');
}

/**
 * Check if user has any admin role
 */
export function isAdmin(user: Auth0User | null): boolean {
  return isSuperAdmin(user) || isTenantAdmin(user);
}

/**
 * Get organization ID from user session
 */
export function getOrgId(user: Auth0User | null): string | null {
  return user?.org_id || null;
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth(): Promise<Auth0User> {
  const user = await getAuth0User();
  if (!user) {
    throw new Error('Unauthorized - Authentication required');
  }
  return user;
}

/**
 * Require specific role - throw error if user doesn't have it
 */
export async function requireRole(role: string): Promise<Auth0User> {
  const user = await requireAuth();
  if (!hasRole(user, role)) {
    throw new Error(`Forbidden - ${role} role required`);
  }
  return user;
}

/**
 * Require super admin access
 */
export async function requireSuperAdmin(): Promise<Auth0User> {
  return requireRole('Super Admin');
}

/**
 * Require tenant admin access
 */
export async function requireTenantAdmin(): Promise<Auth0User> {
  const user = await requireAuth();
  if (!isTenantAdmin(user) && !isSuperAdmin(user)) {
    throw new Error('Forbidden - Tenant Admin role required');
  }
  return user;
}

/**
 * Get subdomain from request
 * Returns null for localhost and main domain
 */
export function getSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') || '';

  // Localhost
  if (hostname.includes('localhost')) return null;

  // Production domain (e.g., demo1.aivii.co.uk)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Ignore 'www' and 'admin'
    if (subdomain === 'www' || subdomain === 'admin') return null;
    return subdomain;
  }

  return null;
}

/**
 * Check if request is for admin portal
 */
export function isAdminPortal(request: NextRequest): boolean {
  const hostname = request.headers.get('host') || '';
  return hostname.startsWith('admin.');
}

/**
 * Check if request is for super admin
 */
export function isSuperAdminPortal(pathname: string): boolean {
  return pathname.startsWith('/super-admin');
}

/**
 * Check if request is for tenant admin
 */
export function isTenantAdminPortal(pathname: string): boolean {
  return pathname.startsWith('/tenant-admin');
}
