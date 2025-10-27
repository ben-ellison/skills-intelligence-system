-- ============================================
-- VERIFICATION QUERIES FOR MIGRATION 009
-- ============================================
-- Run these in Supabase SQL Editor to verify the migration worked

-- ============================================
-- 1. TEST THE PARSING FUNCTION
-- ============================================

-- Test Case 1: Full stack report (LMS + E&M + CRM)
SELECT
  'Test 1: APTEM-BKSB-HUBSPOT - Operations Leader v1.2' as test_case,
  *
FROM parse_report_name('APTEM-BKSB-HUBSPOT - Operations Leader v1.2');

-- Expected Output:
-- provider_code: APTEM-BKSB-HUBSPOT
-- lms_code: APTEM
-- english_maths_code: BKSB
-- crm_code: HUBSPOT
-- hr_code: NULL
-- role_name: Operations Leader
-- report_version: 1.2

-- Test Case 2: With HR provider
SELECT
  'Test 2: BUD-FUNC-SF-SAGEHR - Senior Leader v2.0' as test_case,
  *
FROM parse_report_name('BUD-FUNC-SF-SAGEHR - Senior Leader v2.0');

-- Expected Output:
-- provider_code: BUD-FUNC-SF-SAGEHR
-- lms_code: BUD
-- english_maths_code: FUNC
-- crm_code: SF
-- hr_code: SAGEHR
-- role_name: Senior Leader
-- report_version: 2.0

-- Test Case 3: LMS only
SELECT
  'Test 3: ONEFILE - Immediate Priorities v1.5' as test_case,
  *
FROM parse_report_name('ONEFILE - Immediate Priorities v1.5');

-- Expected Output:
-- provider_code: ONEFILE
-- lms_code: ONEFILE
-- english_maths_code: NULL
-- crm_code: NULL
-- hr_code: NULL
-- role_name: Immediate Priorities
-- report_version: 1.5

-- Test Case 4: Universal report (no provider codes)
SELECT
  'Test 4: Universal Dashboard v1.0' as test_case,
  *
FROM parse_report_name('Universal Dashboard v1.0');

-- Expected Output:
-- provider_code: Universal Dashboard
-- lms_code: NULL
-- english_maths_code: NULL
-- crm_code: NULL
-- hr_code: NULL
-- role_name: NULL
-- report_version: NULL

-- ============================================
-- 2. CHECK NEW COLUMNS EXIST
-- ============================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'powerbi_reports'
  AND column_name IN (
    'provider_code',
    'lms_code',
    'english_maths_code',
    'crm_code',
    'hr_code',
    'role_name',
    'report_version'
  )
ORDER BY column_name;

-- Expected: 7 rows showing all the new columns

-- ============================================
-- 3. CHECK INDEXES WERE CREATED
-- ============================================

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'powerbi_reports'
  AND indexname LIKE 'idx_powerbi_reports_%code'
ORDER BY indexname;

-- Expected: 5 indexes for provider codes

-- ============================================
-- 4. CHECK TRIGGER EXISTS
-- ============================================

SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_parse_report_name';

-- Expected: 1 row showing the trigger

-- ============================================
-- 5. CHECK HELPER VIEW EXISTS
-- ============================================

SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name = 'v_report_provider_codes';

-- Expected: 1 row showing the view

-- ============================================
-- 6. TEST AUTO-PARSING WITH INSERT
-- ============================================

-- Insert a test report (will be auto-parsed by trigger)
INSERT INTO powerbi_reports (
  name,
  description,
  powerbi_report_id,
  powerbi_workspace_id,
  category,
  is_template,
  is_active
) VALUES (
  'APTEM-BKSB-HUBSPOT - Test Operations Report v1.0',
  'Test report to verify auto-parsing',
  'test-report-id-' || gen_random_uuid()::text,
  'test-workspace-id-' || gen_random_uuid()::text,
  'operations',
  true,
  true
) RETURNING
  id,
  name,
  provider_code,
  lms_code,
  english_maths_code,
  crm_code,
  role_name,
  report_version;

-- Expected Output:
-- provider_code: APTEM-BKSB-HUBSPOT
-- lms_code: APTEM
-- english_maths_code: BKSB
-- crm_code: HUBSPOT
-- role_name: Test Operations Report
-- report_version: 1.0

-- ============================================
-- 7. VIEW ALL REPORTS WITH PARSED CODES
-- ============================================

SELECT
  id,
  name,
  provider_code,
  lms_code,
  english_maths_code,
  crm_code,
  hr_code,
  role_name,
  report_version,
  stack_type
FROM v_report_provider_codes
WHERE is_template = true
ORDER BY stack_type, name;

-- ============================================
-- 8. TEST MATCHING FUNCTION (if you have an org)
-- ============================================

-- First, find an organization ID
SELECT
  id,
  name,
  subdomain
FROM organizations
LIMIT 5;

-- Then test matching (replace with actual org ID)
-- SELECT * FROM find_matching_reports_for_org('your-org-id-here');

-- ============================================
-- 9. CLEANUP TEST DATA (optional)
-- ============================================

-- Remove the test report we inserted
-- DELETE FROM powerbi_reports
-- WHERE name LIKE 'APTEM-BKSB-HUBSPOT - Test Operations Report%';

-- ============================================
-- ✅ SUCCESS INDICATORS
-- ============================================

-- If all queries above return expected results, migration 009 is successful!
--
-- You should see:
-- ✅ Parse function extracts all codes correctly
-- ✅ All 7 new columns exist
-- ✅ 5 indexes created
-- ✅ Trigger auto-parses on insert
-- ✅ View shows parsed codes
-- ✅ Matching function returns scored results
