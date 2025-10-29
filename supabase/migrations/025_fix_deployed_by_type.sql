-- ============================================
-- MIGRATION 025: Fix deployed_by column type
-- ============================================
-- The deployed_by column should be TEXT (email) not UUID
-- Migration 018 defined it as TEXT but the table has it as UUID
-- First we need to drop the foreign key constraint, then change the type

-- Step 1: Find and drop the foreign key constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'organization_powerbi_reports'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name LIKE '%deployed_by%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE organization_powerbi_reports DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    END IF;
END $$;

-- Step 2: Change deployed_by from UUID to TEXT
ALTER TABLE organization_powerbi_reports
ALTER COLUMN deployed_by TYPE TEXT USING deployed_by::text;

-- Step 3: Update comment
COMMENT ON COLUMN organization_powerbi_reports.deployed_by IS 'Email of user who deployed the report';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 025 completed successfully!';
  RAISE NOTICE '✓ Dropped foreign key constraint on deployed_by';
  RAISE NOTICE '✓ Changed deployed_by column from UUID to TEXT';
  RAISE NOTICE '✓ Column now stores email addresses as intended';
  RAISE NOTICE '✓ Refreshed PostgREST schema cache';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: deployed_by now stores email addresses directly instead of user IDs';
END $$;
