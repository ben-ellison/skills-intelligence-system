-- ============================================
-- MIGRATION 026: Fix page name typos and mismatches
-- ============================================
-- Fix spelling and naming issues in global module_tabs that prevent auto-matching

-- Fix typo: "Acitivies" -> "Activities"
UPDATE module_tabs
SET page_name = 'Skills Coach LP Activities'
WHERE page_name = 'Skills Coach LP Acitivies'
  AND module_name = 'Operations'
  AND tab_name = 'Skills Coach';

-- Add "Dashboard" suffix to match actual workspace page names
UPDATE module_tabs
SET page_name = 'Operations Leader Dashboard'
WHERE page_name = 'Operations Leader'
  AND module_name = 'Operations'
  AND tab_name = 'Operations Leader';

UPDATE module_tabs
SET page_name = 'Quality Leader Dashboard'
WHERE page_name = 'Quality Leader'
  AND module_name = 'Operations'
  AND tab_name = 'Quality Leader';

-- Update any that are NULL or empty
UPDATE module_tabs
SET page_name = tab_name
WHERE page_name IS NULL OR page_name = ''
  AND is_active = true;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 026 completed successfully!';
  RAISE NOTICE '✓ Fixed "Acitivies" typo to "Activities"';
  RAISE NOTICE '✓ Added "Dashboard" suffixes to match workspace pages';
  RAISE NOTICE '✓ Updated null/empty page names';
  RAISE NOTICE '✓ Refreshed PostgREST schema cache';
  RAISE NOTICE '';
  RAISE NOTICE 'Re-run "Scan Workspace & Auto-Deploy" to match the corrected page names';
END $$;
