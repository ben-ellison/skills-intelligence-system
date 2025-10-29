-- ============================================
-- MIGRATION 021: Add Table Name to Field Mappings
-- ============================================
-- Adds table_name column to schema_field_mappings
-- This allows specifying which table the mapped field belongs to

-- Add table_name column
ALTER TABLE schema_field_mappings
ADD COLUMN IF NOT EXISTS table_name TEXT;

COMMENT ON COLUMN schema_field_mappings.table_name IS 'Database table name where the mapped field exists (e.g., learners, employers, programmes)';

-- Create index for table lookups
CREATE INDEX IF NOT EXISTS idx_schema_mappings_table ON schema_field_mappings(table_name);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 021 completed successfully!';
  RAISE NOTICE '✓ Added table_name column to schema_field_mappings';
  RAISE NOTICE '✓ Added index for table lookups';
  RAISE NOTICE '';
  RAISE NOTICE 'Field mappings can now specify:';
  RAISE NOTICE '  - Table: learners';
  RAISE NOTICE '  - Field: CoachEmail';
  RAISE NOTICE '  - Full path: learners.CoachEmail';
END $$;
