-- Migration: Add logo support to organizations
-- This allows organizations to upload a logo for dual branding

-- Add logo_url column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN organizations.logo_url IS 'URL to the organization logo image stored in Supabase Storage';
