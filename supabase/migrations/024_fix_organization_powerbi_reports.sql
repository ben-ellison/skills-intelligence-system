-- ============================================
-- MIGRATION 024: Fix organization_powerbi_reports Schema
-- ============================================
-- Adds missing columns that were in the original migration 018
-- but are not present in the current table structure

-- Add missing columns
ALTER TABLE organization_powerbi_reports
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS deployment_error TEXT;

-- Make name NOT NULL after adding it (set a default for existing rows first)
UPDATE organization_powerbi_reports
SET name = COALESCE(custom_display_name, powerbi_report_id)
WHERE name IS NULL;

ALTER TABLE organization_powerbi_reports
ALTER COLUMN name SET NOT NULL;

-- Add comments
COMMENT ON COLUMN organization_powerbi_reports.name IS 'Report name in PowerBI';
COMMENT ON COLUMN organization_powerbi_reports.display_name IS 'Human-readable display name';
COMMENT ON COLUMN organization_powerbi_reports.description IS 'Report description';
COMMENT ON COLUMN organization_powerbi_reports.deployment_error IS 'Error message if deployment failed';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 024 completed successfully!';
  RAISE NOTICE '✓ Added missing name column (NOT NULL)';
  RAISE NOTICE '✓ Added display_name column';
  RAISE NOTICE '✓ Added description column';
  RAISE NOTICE '✓ Added deployment_error column';
  RAISE NOTICE '✓ Refreshed PostgREST schema cache';
  RAISE NOTICE '';
  RAISE NOTICE 'The schema cache error should now be resolved.';
END $$;
