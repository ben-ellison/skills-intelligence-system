-- ============================================
-- PROVIDER CODE MATCHING FOR POWERBI REPORTS
-- ============================================
-- Enables intelligent matching of PowerBI reports to organizations
-- based on provider configuration codes in report names
--
-- Example naming convention:
-- "APTEM-BKSB-HUBSPOT - Operations Leader v1.2"
-- Matches organizations with Aptem LMS + BKSB E&M + HubSpot CRM

-- ============================================
-- 1. ADD PROVIDER CODE FIELDS TO POWERBI_REPORTS
-- ============================================

ALTER TABLE powerbi_reports
ADD COLUMN IF NOT EXISTS provider_code TEXT,
ADD COLUMN IF NOT EXISTS lms_code TEXT,
ADD COLUMN IF NOT EXISTS english_maths_code TEXT,
ADD COLUMN IF NOT EXISTS crm_code TEXT,
ADD COLUMN IF NOT EXISTS hr_code TEXT,
ADD COLUMN IF NOT EXISTS role_name TEXT,
ADD COLUMN IF NOT EXISTS report_version TEXT;

-- Add indexes for efficient matching
CREATE INDEX IF NOT EXISTS idx_powerbi_reports_provider_code ON powerbi_reports(provider_code);
CREATE INDEX IF NOT EXISTS idx_powerbi_reports_lms_code ON powerbi_reports(lms_code);
CREATE INDEX IF NOT EXISTS idx_powerbi_reports_em_code ON powerbi_reports(english_maths_code);
CREATE INDEX IF NOT EXISTS idx_powerbi_reports_crm_code ON powerbi_reports(crm_code);
CREATE INDEX IF NOT EXISTS idx_powerbi_reports_hr_code ON powerbi_reports(hr_code);

-- Add comments
COMMENT ON COLUMN powerbi_reports.provider_code IS 'Full provider code string extracted from report name (e.g., "APTEM-BKSB-HUBSPOT")';
COMMENT ON COLUMN powerbi_reports.lms_code IS 'LMS provider code (APTEM, BUD, ONEFILE)';
COMMENT ON COLUMN powerbi_reports.english_maths_code IS 'English & Maths provider code (BKSB, FUNC, SMARTASSESSOR)';
COMMENT ON COLUMN powerbi_reports.crm_code IS 'CRM provider code (HUBSPOT, SF, DYNAMICS, ZOHO)';
COMMENT ON COLUMN powerbi_reports.hr_code IS 'HR provider code (SAGEHR, BAMBOOHR)';
COMMENT ON COLUMN powerbi_reports.role_name IS 'Target role extracted from report name (e.g., "Operations Leader")';
COMMENT ON COLUMN powerbi_reports.report_version IS 'Version number extracted from report name (e.g., "1.2")';

-- ============================================
-- 2. PROVIDER CODE PARSING FUNCTION
-- ============================================

-- Function to parse report name and extract provider codes
CREATE OR REPLACE FUNCTION parse_report_name(report_name TEXT)
RETURNS TABLE (
  provider_code TEXT,
  lms_code TEXT,
  english_maths_code TEXT,
  crm_code TEXT,
  hr_code TEXT,
  role_name TEXT,
  report_version TEXT
) AS $$
DECLARE
  parts TEXT[];
  provider_parts TEXT[];
  version_match TEXT;
  role_part TEXT;
  code_part TEXT;
  i INTEGER;
  known_lms TEXT[] := ARRAY['APTEM', 'BUD', 'ONEFILE'];
  known_em TEXT[] := ARRAY['BKSB', 'FUNC', 'SMARTASSESSOR'];
  known_crm TEXT[] := ARRAY['HUBSPOT', 'SF', 'DYNAMICS', 'ZOHO'];
  known_hr TEXT[] := ARRAY['SAGEHR', 'BAMBOOHR'];
BEGIN
  -- Initialize return values
  provider_code := NULL;
  lms_code := NULL;
  english_maths_code := NULL;
  crm_code := NULL;
  hr_code := NULL;
  role_name := NULL;
  report_version := NULL;

  -- Return if name is null or empty
  IF report_name IS NULL OR report_name = '' THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- Split by " - " to separate provider codes from role name
  parts := string_to_array(report_name, ' - ');

  IF array_length(parts, 1) >= 1 THEN
    code_part := parts[1];

    -- Extract provider codes (before the dash)
    provider_parts := string_to_array(code_part, '-');
    provider_code := code_part;

    -- Match each part to known provider types
    FOR i IN 1..array_length(provider_parts, 1) LOOP
      DECLARE
        code TEXT := UPPER(TRIM(provider_parts[i]));
      BEGIN
        -- Check if it's an LMS code
        IF code = ANY(known_lms) THEN
          lms_code := code;
        -- Check if it's an English & Maths code
        ELSIF code = ANY(known_em) THEN
          english_maths_code := code;
        -- Check if it's a CRM code
        ELSIF code = ANY(known_crm) THEN
          crm_code := code;
        -- Check if it's an HR code
        ELSIF code = ANY(known_hr) THEN
          hr_code := code;
        END IF;
      END;
    END LOOP;
  END IF;

  -- Extract role name and version if present
  IF array_length(parts, 1) >= 2 THEN
    role_part := parts[2];

    -- Extract version using regex (e.g., "v1.2" or "v2.0")
    version_match := substring(role_part from 'v?(\d+\.\d+)$');

    IF version_match IS NOT NULL THEN
      report_version := version_match;
      -- Remove version from role name
      role_name := TRIM(regexp_replace(role_part, '\s*v?\d+\.\d+\s*$', ''));
    ELSE
      role_name := TRIM(role_part);
    END IF;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION parse_report_name IS 'Parses PowerBI report name to extract provider codes, role name, and version';

-- ============================================
-- 3. TRIGGER TO AUTO-PARSE REPORT NAMES
-- ============================================

CREATE OR REPLACE FUNCTION auto_parse_report_name()
RETURNS TRIGGER AS $$
DECLARE
  parsed RECORD;
BEGIN
  -- Parse the report name
  SELECT * INTO parsed FROM parse_report_name(NEW.name) LIMIT 1;

  -- Update the provider code fields
  NEW.provider_code := parsed.provider_code;
  NEW.lms_code := parsed.lms_code;
  NEW.english_maths_code := parsed.english_maths_code;
  NEW.crm_code := parsed.crm_code;
  NEW.hr_code := parsed.hr_code;
  NEW.role_name := parsed.role_name;
  NEW.report_version := parsed.report_version;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_parse_report_name ON powerbi_reports;
CREATE TRIGGER trigger_parse_report_name
  BEFORE INSERT OR UPDATE OF name ON powerbi_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_parse_report_name();

COMMENT ON FUNCTION auto_parse_report_name IS 'Trigger function to automatically parse report name on insert/update';

-- ============================================
-- 4. FUNCTION TO FIND MATCHING REPORTS FOR AN ORGANIZATION
-- ============================================

CREATE OR REPLACE FUNCTION find_matching_reports_for_org(org_id UUID)
RETURNS TABLE (
  report_id UUID,
  report_name TEXT,
  provider_code TEXT,
  category TEXT,
  match_type TEXT,
  match_score INTEGER
) AS $$
DECLARE
  org_lms_id UUID;
  org_em_id UUID;
  org_crm_id UUID;
  org_hr_id UUID;
  org_lms_code TEXT;
  org_em_code TEXT;
  org_crm_code TEXT;
  org_hr_code TEXT;
BEGIN
  -- Get organization's provider IDs
  SELECT
    lms_provider_id,
    english_maths_provider_id,
    crm_provider_id,
    hr_provider_id
  INTO
    org_lms_id,
    org_em_id,
    org_crm_id,
    org_hr_id
  FROM organizations
  WHERE id = org_id;

  -- Get provider codes
  SELECT code INTO org_lms_code FROM integration_providers WHERE id = org_lms_id;
  SELECT code INTO org_em_code FROM integration_providers WHERE id = org_em_id;
  SELECT code INTO org_crm_code FROM integration_providers WHERE id = org_crm_id;
  SELECT code INTO org_hr_code FROM integration_providers WHERE id = org_hr_id;

  -- Return matching reports with scoring
  RETURN QUERY
  SELECT
    pr.id,
    pr.name,
    pr.provider_code,
    pr.category,
    CASE
      -- Exact match all providers
      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code = org_em_code
        AND pr.crm_code = org_crm_code
        AND (pr.hr_code = org_hr_code OR pr.hr_code IS NULL)
      THEN 'exact_match'

      -- Core match (LMS + E&M + CRM, ignore HR)
      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code = org_em_code
        AND pr.crm_code = org_crm_code
      THEN 'core_match'

      -- Partial match (LMS + E&M)
      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code = org_em_code
        AND pr.crm_code IS NULL
      THEN 'partial_match'

      -- LMS only match
      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code IS NULL
        AND pr.crm_code IS NULL
      THEN 'lms_only'

      ELSE 'no_match'
    END AS match_type,
    CASE
      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code = org_em_code
        AND pr.crm_code = org_crm_code
        AND pr.hr_code = org_hr_code
      THEN 100

      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code = org_em_code
        AND pr.crm_code = org_crm_code
      THEN 90

      WHEN pr.lms_code = org_lms_code
        AND pr.english_maths_code = org_em_code
      THEN 70

      WHEN pr.lms_code = org_lms_code
      THEN 50

      ELSE 0
    END AS match_score
  FROM powerbi_reports pr
  WHERE pr.is_template = true
    AND (
      (pr.lms_code = org_lms_code AND pr.lms_code IS NOT NULL)
      OR
      (pr.lms_code IS NULL AND pr.english_maths_code IS NULL AND pr.crm_code IS NULL AND pr.hr_code IS NULL)
    )
  ORDER BY match_score DESC, pr.category, pr.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_matching_reports_for_org IS 'Finds all PowerBI report templates matching an organization provider configuration';

-- ============================================
-- 5. UPDATE EXISTING REPORTS (BACKFILL)
-- ============================================

-- Update existing reports to parse their names
UPDATE powerbi_reports
SET name = name
WHERE name IS NOT NULL;

-- ============================================
-- 6. HELPER VIEW FOR REPORT MATCHING
-- ============================================

CREATE OR REPLACE VIEW v_report_provider_codes AS
SELECT
  pr.id,
  pr.name,
  pr.provider_code,
  pr.lms_code,
  pr.english_maths_code,
  pr.crm_code,
  pr.hr_code,
  pr.role_name,
  pr.report_version,
  pr.category,
  pr.is_template,
  pr.is_active,
  CASE
    WHEN pr.lms_code IS NOT NULL
      AND pr.english_maths_code IS NOT NULL
      AND pr.crm_code IS NOT NULL
      AND pr.hr_code IS NOT NULL
    THEN 'full_stack'
    WHEN pr.lms_code IS NOT NULL
      AND pr.english_maths_code IS NOT NULL
      AND pr.crm_code IS NOT NULL
    THEN 'core_stack'
    WHEN pr.lms_code IS NOT NULL
      AND pr.english_maths_code IS NOT NULL
    THEN 'lms_em_only'
    WHEN pr.lms_code IS NOT NULL
    THEN 'lms_only'
    ELSE 'universal'
  END AS stack_type
FROM powerbi_reports pr;

COMMENT ON VIEW v_report_provider_codes IS 'View showing all reports with parsed provider codes and stack classification';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test the parsing function
-- SELECT * FROM parse_report_name('APTEM-BKSB-HUBSPOT - Operations Leader v1.2');
-- SELECT * FROM parse_report_name('BUD-FUNC-SF - Senior Leader v2.0');
-- SELECT * FROM parse_report_name('ONEFILE - Immediate Priorities v1.5');

-- View all reports with their parsed codes
-- SELECT * FROM v_report_provider_codes;

-- Find matching reports for a specific organization
-- SELECT * FROM find_matching_reports_for_org('your-org-id-here');
