-- ============================================
-- MIGRATION 027: Fix PowerBI Page IDs to Display Names
-- ============================================
-- Some global module tabs have PowerBI internal page IDs stored
-- instead of human-readable page display names.
-- This migration identifies and fixes common patterns.

-- Show current page_name values that look like GUIDs (for debugging)
DO $$
DECLARE
    tab_record RECORD;
BEGIN
    RAISE NOTICE 'Global module tabs with GUID-like page names:';
    FOR tab_record IN
        SELECT module_name, tab_name, page_name
        FROM module_tabs
        WHERE page_name ~ '^[a-f0-9]{20,}$'
          AND is_active = true
    LOOP
        RAISE NOTICE '  Module: %, Tab: %, Page: %',
            tab_record.module_name,
            tab_record.tab_name,
            tab_record.page_name;
    END LOOP;
END $$;

-- For now, set page_name to match tab_name for any that look like GUIDs
-- This is a safe fallback that will at least make them readable
UPDATE module_tabs
SET page_name = tab_name
WHERE page_name ~ '^[a-f0-9]{20,}$'  -- Matches hex strings 20+ chars (likely GUIDs)
  AND is_active = true;

-- Specific fixes for known tabs based on common naming patterns
-- Compliance Leader should use "Compliance Leader Dashboard"
UPDATE module_tabs
SET page_name = 'Compliance Leader Dashboard'
WHERE tab_name = 'Compliance Leader'
  AND module_name = 'Compliance'
  AND is_active = true;

-- Compliance Learner Drill Through
UPDATE module_tabs
SET page_name = 'Compliance Learner Drill Through'
WHERE tab_name = 'Compliance Learner Drill Through'
  AND module_name = 'Compliance'
  AND is_active = true;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 027 completed successfully!';
  RAISE NOTICE '✓ Converted PowerBI page IDs to human-readable names';
  RAISE NOTICE '✓ Fixed Compliance Leader and other tabs';
  RAISE NOTICE '✓ Refreshed PostgREST schema cache';
  RAISE NOTICE '';
  RAISE NOTICE 'You may need to manually verify page names match your workspace reports.';
  RAISE NOTICE 'Re-run "Scan Workspace & Auto-Deploy" to test the fixes.';
END $$;
