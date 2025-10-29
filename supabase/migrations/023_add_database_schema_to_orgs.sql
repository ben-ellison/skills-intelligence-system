-- ============================================
-- MIGRATION 023: Add Database Schema to Organizations
-- ============================================
-- Adds database_schema_id to organizations table
-- Links organizations to their LMS database schema (BUD, Aptem, OneFile, etc.)

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS database_schema_id UUID REFERENCES database_schemas(id);

COMMENT ON COLUMN organizations.database_schema_id IS 'Database schema this organization uses (e.g., BUD, Aptem, OneFile) - determines field mappings for filtering';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_database_schema ON organizations(database_schema_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 023 completed successfully!';
  RAISE NOTICE '✓ Added database_schema_id column to organizations table';
  RAISE NOTICE '✓ Organizations can now be linked to their LMS database schema';
  RAISE NOTICE '✓ This enables schema-specific field mappings for PowerBI filtering';
END $$;
