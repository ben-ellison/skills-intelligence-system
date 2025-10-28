-- ============================================
-- MIGRATION 020: Database Schema Configuration
-- ============================================
-- Creates tables for managing database schema field mappings
-- Allows mapping standard fields to different LMS provider schemas
-- (BUD, Aptem, OneFile, etc.)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DATABASE_SCHEMAS
-- ============================================
-- Stores the different database schema types (LMS providers)

CREATE TABLE IF NOT EXISTS database_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Schema Information
  name TEXT NOT NULL UNIQUE, -- e.g., 'bud', 'aptem', 'onefile'
  display_name TEXT NOT NULL, -- e.g., 'BUD', 'Aptem', 'OneFile'
  description TEXT, -- Optional description of the schema

  -- Provider Information
  provider_type TEXT, -- e.g., 'lms', 'crm', 'hr'

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- Email of super admin who created it
  updated_by TEXT -- Email of super admin who last updated it
);

COMMENT ON TABLE database_schemas IS 'Database schema types (LMS providers like BUD, Aptem, OneFile)';
COMMENT ON COLUMN database_schemas.name IS 'Unique identifier for the schema (lowercase, no spaces)';
COMMENT ON COLUMN database_schemas.display_name IS 'Human-readable name shown in UI';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_database_schemas_name ON database_schemas(name);
CREATE INDEX IF NOT EXISTS idx_database_schemas_active ON database_schemas(is_active);
CREATE INDEX IF NOT EXISTS idx_database_schemas_provider ON database_schemas(provider_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_database_schemas_updated_at ON database_schemas;
CREATE TRIGGER update_database_schemas_updated_at
  BEFORE UPDATE ON database_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. SCHEMA_FIELD_MAPPINGS
-- ============================================
-- Maps standard field names to schema-specific field names

CREATE TABLE IF NOT EXISTS schema_field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Schema Reference
  schema_id UUID REFERENCES database_schemas(id) ON DELETE CASCADE NOT NULL,

  -- Field Information
  standard_field_name TEXT NOT NULL, -- e.g., 'operations_manager_name', 'skills_coach_email'
  standard_field_label TEXT NOT NULL, -- e.g., 'Operations Manager Name', 'Skills Coach Email'
  mapped_field_name TEXT NOT NULL, -- e.g., 'OpsMgr_Name', 'CoachEmail', 'skills_coach_email'

  -- Field Type & Configuration
  field_type TEXT DEFAULT 'text', -- 'text', 'email', 'number', 'date', 'boolean'
  is_required BOOLEAN DEFAULT false, -- Whether this field is required for filtering
  description TEXT, -- Optional description or notes

  -- Usage
  used_for_filtering BOOLEAN DEFAULT true, -- Whether this field is used for PowerBI filtering
  used_for_ai BOOLEAN DEFAULT false, -- Whether this field is used by AI summaries

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique mappings per schema
  UNIQUE(schema_id, standard_field_name)
);

COMMENT ON TABLE schema_field_mappings IS 'Maps standard field names to schema-specific field names';
COMMENT ON COLUMN schema_field_mappings.standard_field_name IS 'Standard internal field identifier (e.g., operations_manager_name)';
COMMENT ON COLUMN schema_field_mappings.standard_field_label IS 'Human-readable label shown in UI';
COMMENT ON COLUMN schema_field_mappings.mapped_field_name IS 'Actual field name in the database schema';
COMMENT ON COLUMN schema_field_mappings.used_for_filtering IS 'Whether this field is used for PowerBI RLS filtering';
COMMENT ON COLUMN schema_field_mappings.used_for_ai IS 'Whether this field is used by AI summary system';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schema_mappings_schema ON schema_field_mappings(schema_id);
CREATE INDEX IF NOT EXISTS idx_schema_mappings_standard ON schema_field_mappings(standard_field_name);
CREATE INDEX IF NOT EXISTS idx_schema_mappings_active ON schema_field_mappings(is_active);
CREATE INDEX IF NOT EXISTS idx_schema_mappings_filtering ON schema_field_mappings(used_for_filtering);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_schema_field_mappings_updated_at ON schema_field_mappings;
CREATE TRIGGER update_schema_field_mappings_updated_at
  BEFORE UPDATE ON schema_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Insert Default Standard Fields
-- ============================================
-- These are the standard fields that can be mapped

-- Note: We'll insert these via the UI, but here are common ones:
-- - operations_manager_name
-- - skills_coach_name / skills_coach_email
-- - iqa_name / iqa_email
-- - learner_name / learner_email
-- - employer_name
-- - apprenticeship_title
-- - start_date
-- - end_date

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 020 completed successfully!';
  RAISE NOTICE '✓ Created database_schemas table';
  RAISE NOTICE '✓ Created schema_field_mappings table';
  RAISE NOTICE '✓ Added indexes and triggers';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Add database schemas (BUD, Aptem, OneFile) via Super Admin UI';
  RAISE NOTICE '2. Configure field mappings for each schema';
  RAISE NOTICE '3. Update PowerBI filtering to use schema mappings';
END $$;
