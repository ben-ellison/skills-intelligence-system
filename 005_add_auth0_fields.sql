-- Migration: Add Auth0 integration fields
-- This migration adds fields to support Auth0 authentication

-- Add Auth0 user ID to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth0_user_id TEXT UNIQUE;

-- Add Auth0 organization ID to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS auth0_organization_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_user_id ON users(auth0_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_auth0_org_id ON organizations(auth0_organization_id);

-- Update existing demo user to have an Auth0 user ID placeholder
-- You'll need to update this with real Auth0 user IDs after creating users in Auth0
UPDATE users
SET auth0_user_id = 'auth0|placeholder_' || id::text
WHERE auth0_user_id IS NULL;

-- Update demo organization with Auth0 org ID placeholder
UPDATE organizations
SET auth0_organization_id = 'org_placeholder_' || id::text
WHERE auth0_organization_id IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN users.auth0_user_id IS 'Auth0 user identifier (e.g., auth0|123456789)';
COMMENT ON COLUMN organizations.auth0_organization_id IS 'Auth0 Organization ID for multi-tenant isolation';
