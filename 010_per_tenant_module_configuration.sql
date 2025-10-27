-- ============================================
-- PER-TENANT MODULE CONFIGURATION
-- ============================================
-- Allows each organization to have custom module/page configurations
-- while maintaining global templates as defaults
--
-- Current Problem: Module configurations are global
-- Solution: Allow organization-specific overrides

-- ============================================
-- 1. RENAME CURRENT TABLES TO INDICATE THEY'RE TEMPLATES
-- ============================================

-- These become "template" configurations
COMMENT ON TABLE modules IS 'Global module templates - define default module structures';
COMMENT ON TABLE module_features IS 'Global feature templates - define default features per module';

-- ============================================
-- 2. CREATE ORGANIZATION MODULE OVERRIDES
-- ============================================

CREATE TABLE IF NOT EXISTS organization_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  template_module_id UUID REFERENCES modules(id) ON DELETE CASCADE,

  -- Module configuration (can override template)
  name TEXT NOT NULL, -- e.g., "Quality Leader"
  display_name TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Custom configuration
  custom_config JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure module name is unique per organization
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_org_modules_org ON organization_modules(organization_id);
CREATE INDEX idx_org_modules_template ON organization_modules(template_module_id);
CREATE INDEX idx_org_modules_active ON organization_modules(organization_id, is_active);

COMMENT ON TABLE organization_modules IS 'Organization-specific module configurations (overrides global templates)';
COMMENT ON COLUMN organization_modules.template_module_id IS 'Links to global module template, NULL if fully custom module';
COMMENT ON COLUMN organization_modules.custom_config IS 'Organization-specific settings for this module';

-- ============================================
-- 3. CREATE ORGANIZATION MODULE FEATURES
-- ============================================

CREATE TABLE IF NOT EXISTS organization_module_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  organization_module_id UUID REFERENCES organization_modules(id) ON DELETE CASCADE NOT NULL,
  template_feature_id UUID REFERENCES module_features(id) ON DELETE SET NULL,
  organization_report_id UUID REFERENCES organization_powerbi_reports(id) ON DELETE CASCADE,

  -- Feature configuration
  page_name_or_id TEXT NOT NULL, -- PowerBI page name or ID
  display_name TEXT, -- Display name in navigation (if different from page name)
  tab_name TEXT, -- Tab name shown to users
  sort_order INTEGER DEFAULT 0,

  -- Report filter configuration
  report_filter JSONB DEFAULT '{}',

  -- Visibility settings
  enable_ai_insights BOOLEAN DEFAULT false,
  prompt TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure page is unique per org module
  UNIQUE(organization_module_id, page_name_or_id)
);

CREATE INDEX idx_org_features_module ON organization_module_features(organization_module_id);
CREATE INDEX idx_org_features_report ON organization_module_features(organization_report_id);
CREATE INDEX idx_org_features_template ON organization_module_features(template_feature_id);
CREATE INDEX idx_org_features_active ON organization_module_features(organization_module_id, is_active);

COMMENT ON TABLE organization_module_features IS 'Organization-specific feature/page configurations per module';
COMMENT ON COLUMN organization_module_features.template_feature_id IS 'Links to global feature template, NULL if custom feature';
COMMENT ON COLUMN organization_module_features.organization_report_id IS 'Links to the actual deployed report in org workspace';
COMMENT ON COLUMN organization_module_features.page_name_or_id IS 'PowerBI page name or GUID to display';
COMMENT ON COLUMN organization_module_features.display_name IS 'Override display name for this page';
COMMENT ON COLUMN organization_module_features.tab_name IS 'What users see in the tab/navigation';

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to copy template modules to an organization
CREATE OR REPLACE FUNCTION initialize_organization_modules(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  module_record RECORD;
  feature_record RECORD;
  new_module_id UUID;
  new_feature_id UUID;
  total_copied INTEGER := 0;
BEGIN
  -- Copy all active template modules
  FOR module_record IN
    SELECT * FROM modules WHERE is_active = true
  LOOP
    -- Insert module for this organization
    INSERT INTO organization_modules (
      organization_id,
      template_module_id,
      name,
      display_name,
      sort_order,
      is_active
    ) VALUES (
      org_id,
      module_record.id,
      module_record.name,
      module_record.name, -- Can be customized later
      module_record.sort_order,
      true
    ) RETURNING id INTO new_module_id;

    total_copied := total_copied + 1;

    -- Copy template features for this module
    FOR feature_record IN
      SELECT * FROM module_features WHERE module_id = module_record.id
    LOOP
      -- Try to find matching deployed report for this org
      -- This will be NULL initially until reports are deployed
      INSERT INTO organization_module_features (
        organization_module_id,
        template_feature_id,
        page_name_or_id,
        display_name,
        tab_name,
        sort_order,
        report_filter,
        enable_ai_insights,
        prompt,
        is_active
      ) VALUES (
        new_module_id,
        feature_record.id,
        feature_record.page_name_or_id,
        feature_record.display_name,
        feature_record.tab_name,
        feature_record.sort_order,
        feature_record.report_filter,
        feature_record.enable_ai_insights,
        feature_record.prompt,
        feature_record.is_active
      );
    END LOOP;
  END LOOP;

  RETURN total_copied;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_organization_modules IS 'Copies all template modules and features to a new organization';

-- Function to get module configuration for an organization
CREATE OR REPLACE FUNCTION get_organization_module_config(org_id UUID, module_name TEXT)
RETURNS TABLE (
  module_id UUID,
  module_display_name TEXT,
  feature_id UUID,
  page_name TEXT,
  tab_name TEXT,
  report_id UUID,
  powerbi_report_id TEXT,
  powerbi_workspace_id TEXT,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.id AS module_id,
    om.display_name AS module_display_name,
    omf.id AS feature_id,
    omf.page_name_or_id AS page_name,
    omf.tab_name,
    opr.id AS report_id,
    opr.powerbi_report_id,
    opr.powerbi_workspace_id,
    omf.sort_order
  FROM organization_modules om
  LEFT JOIN organization_module_features omf ON omf.organization_module_id = om.id
  LEFT JOIN organization_powerbi_reports opr ON opr.id = omf.organization_report_id
  WHERE om.organization_id = org_id
    AND om.name = module_name
    AND om.is_active = true
    AND (omf.is_active = true OR omf.is_active IS NULL)
  ORDER BY omf.sort_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_organization_module_config IS 'Gets complete module configuration for an organization including report mappings';

-- ============================================
-- 5. LINK DEPLOYED REPORTS TO FEATURES
-- ============================================

-- Function to auto-link deployed reports to features based on report name matching
CREATE OR REPLACE FUNCTION link_deployed_reports_to_features(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  feature_record RECORD;
  report_record RECORD;
  matched_count INTEGER := 0;
BEGIN
  -- For each organization feature that doesn't have a report linked
  FOR feature_record IN
    SELECT
      omf.id AS feature_id,
      omf.page_name_or_id,
      mf.pbi_report AS expected_report_name,
      om.name AS module_name
    FROM organization_module_features omf
    JOIN organization_modules om ON om.id = omf.organization_module_id
    LEFT JOIN module_features mf ON mf.id = omf.template_feature_id
    WHERE om.organization_id = org_id
      AND omf.organization_report_id IS NULL
      AND mf.pbi_report IS NOT NULL
  LOOP
    -- Try to find matching deployed report
    SELECT opr.id INTO report_record
    FROM organization_powerbi_reports opr
    JOIN powerbi_reports pr ON pr.id = opr.template_report_id
    WHERE opr.organization_id = org_id
      AND pr.name ILIKE '%' || feature_record.expected_report_name || '%'
    LIMIT 1;

    -- If found, link it
    IF report_record.id IS NOT NULL THEN
      UPDATE organization_module_features
      SET organization_report_id = report_record.id
      WHERE id = feature_record.feature_id;

      matched_count := matched_count + 1;
    END IF;
  END LOOP;

  RETURN matched_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION link_deployed_reports_to_features IS 'Automatically links deployed reports to organization features based on name matching';

-- ============================================
-- 6. HELPER VIEWS
-- ============================================

-- View showing complete org module configuration
CREATE OR REPLACE VIEW v_organization_module_config AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  om.id AS org_module_id,
  om.name AS module_name,
  om.display_name AS module_display_name,
  om.sort_order AS module_sort_order,
  omf.id AS feature_id,
  omf.page_name_or_id,
  omf.display_name AS feature_display_name,
  omf.tab_name,
  omf.sort_order AS feature_sort_order,
  opr.id AS deployed_report_id,
  opr.powerbi_report_id,
  opr.powerbi_workspace_id,
  pr.name AS template_report_name,
  omf.report_filter,
  omf.enable_ai_insights,
  om.is_active AS module_active,
  omf.is_active AS feature_active
FROM organizations o
JOIN organization_modules om ON om.organization_id = o.id
LEFT JOIN organization_module_features omf ON omf.organization_module_id = om.id
LEFT JOIN organization_powerbi_reports opr ON opr.id = omf.organization_report_id
LEFT JOIN powerbi_reports pr ON pr.id = opr.template_report_id
ORDER BY o.name, om.sort_order, omf.sort_order;

COMMENT ON VIEW v_organization_module_config IS 'Complete view of organization module configurations with report mappings';

-- ============================================
-- 7. TRIGGERS
-- ============================================

CREATE TRIGGER update_organization_modules_updated_at
  BEFORE UPDATE ON organization_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_module_features_updated_at
  BEFORE UPDATE ON organization_module_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_module_features ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Initialize modules for a new organization
-- SELECT initialize_organization_modules('acme-org-id');

-- Link deployed reports to features
-- SELECT link_deployed_reports_to_features('acme-org-id');

-- Get module configuration for an organization
-- SELECT * FROM get_organization_module_config('acme-org-id', 'Quality Leader');

-- View all org configurations
-- SELECT * FROM v_organization_module_config WHERE organization_name = 'Acme Training';

-- Update a specific feature for an organization
-- UPDATE organization_module_features
-- SET page_name_or_id = 'Custom Beta QA View',
--     tab_name = 'Quality Analytics'
-- WHERE organization_module_id IN (
--   SELECT id FROM organization_modules
--   WHERE organization_id = 'beta-org-id'
--   AND name = 'Quality Leader'
-- )
-- AND page_name_or_id = 'Quality Manager Dashboard';
