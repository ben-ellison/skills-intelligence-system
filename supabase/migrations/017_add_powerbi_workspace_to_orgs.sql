-- ============================================
-- MIGRATION 017: Add PowerBI Workspace ID to Organizations
-- ============================================
-- Adds powerbi_workspace_id to organizations table for data segregation
-- Each organization must have their own PowerBI workspace with their own reports

-- Add PowerBI workspace ID to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS powerbi_workspace_id TEXT;

COMMENT ON COLUMN organizations.powerbi_workspace_id IS 'PowerBI Workspace ID (GUID) for this organization - used to embed reports from their dedicated workspace';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_powerbi_workspace ON organizations(powerbi_workspace_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 017 completed successfully!';
  RAISE NOTICE '✓ Added powerbi_workspace_id column to organizations table';
  RAISE NOTICE '✓ Each organization can now have their own PowerBI workspace';
  RAISE NOTICE '✓ Report embeds will use organization-specific workspace IDs';
END $$;
