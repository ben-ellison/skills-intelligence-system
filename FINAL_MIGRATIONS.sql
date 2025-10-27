-- ============================================
-- ADD ROLE_ID TO USERS TABLE
-- ============================================
-- This migration adds the role_id column to users table
-- Must run BEFORE creating roles table (due to RLS policies)

-- Add role_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role_id UUID;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

COMMENT ON COLUMN users.role_id IS 'References roles.id - user role for platform access control';
-- ============================================
-- ROLES TABLE
-- ============================================
-- Core roles table for the platform
-- Links to Auth0 roles but stored in Supabase for easier querying

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Role identification
  name TEXT UNIQUE NOT NULL, -- e.g., "Skills Coach", "Operations Leader"
  display_name TEXT NOT NULL,
  description TEXT,

  -- Auth0 integration
  auth0_role_id TEXT, -- Auth0 role ID for syncing

  -- Permissions/capabilities
  permissions JSONB DEFAULT '{}',

  -- Hierarchy
  level INTEGER DEFAULT 0, -- 0=user, 10=manager, 20=leader, 30=senior leader

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_roles_level ON roles(level);

COMMENT ON TABLE roles IS 'Platform roles - linked to Auth0 for authentication';
COMMENT ON COLUMN roles.level IS 'Hierarchy level: 0=user, 10=manager, 20=leader, 30=senior';

-- ============================================
-- SEED ROLES
-- ============================================

INSERT INTO roles (name, display_name, description, level, is_active) VALUES
  ('Super Admin', 'Super Admin', 'Platform administrator with full access', 100, true),
  ('Senior Leader', 'Senior Leader', 'Senior leadership with access to all modules', 30, true),
  ('Operations Leader', 'Operations Leader', 'Operations leadership role', 20, true),
  ('Operations Manager', 'Operations Manager', 'Operations management role', 10, true),
  ('Quality Leader', 'Quality Leader', 'Quality leadership role', 20, true),
  ('Quality Manager', 'Quality Manager', 'Quality management role', 10, true),
  ('Sales Leader', 'Sales Leader', 'Sales leadership role', 20, true),
  ('Salesperson', 'Salesperson', 'Sales representative role', 0, true),
  ('Compliance Leader', 'Compliance Leader', 'Compliance leadership role', 20, true),
  ('Skills Coach', 'Skills Coach', 'Skills coaching role', 0, true),
  ('Learning Support Coach', 'Learning Support Coach', 'Learning support role', 0, true),
  ('Internal Quality Assurer', 'Internal Quality Assurer', 'IQA role', 10, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (needed for role selection in UI)
CREATE POLICY "Roles are viewable by everyone" ON roles
  FOR SELECT USING (true);

-- Super admins can modify roles (will be set up later after users.role_id is populated)
-- Skipping the complex RLS policy that references users.role_id to avoid circular dependency
-- ============================================
-- LINK USERS TO ROLES
-- ============================================
-- Adds foreign key constraint from users.role_id to roles.id
-- Must run AFTER both users and roles tables exist

-- Add foreign key constraint
ALTER TABLE users
ADD CONSTRAINT fk_users_role
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_users_role ON users IS 'Links users to their assigned role';
-- ============================================
-- MODULES AND FEATURES SCHEMA
-- ============================================
-- Global module templates that define the platform navigation structure
-- Based on your existing admin panel (Quality Leader, Operations Leader, etc.)

-- ============================================
-- 1. MODULES (Global Templates)
-- ============================================

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Module identification
  name TEXT UNIQUE NOT NULL, -- e.g., "Quality Leader", "Operations Leader"
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or emoji

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modules_active ON modules(is_active, sort_order);

COMMENT ON TABLE modules IS 'Global module templates - define platform navigation structure';

-- ============================================
-- 2. MODULE FEATURES (Pages within modules)
-- ============================================

CREATE TABLE IF NOT EXISTS module_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,

  -- Feature/Page identification
  page_name_or_id TEXT NOT NULL, -- PowerBI page name or ID
  display_name TEXT, -- Display name in UI
  tab_name TEXT, -- Tab label shown to users
  pbi_report TEXT, -- Expected PowerBI report name (for matching)

  -- Configuration
  report_filter JSONB DEFAULT '{}',
  enable_ai_insights BOOLEAN DEFAULT false,
  prompt TEXT, -- AI prompt if insights enabled

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure page is unique per module
  UNIQUE(module_id, page_name_or_id)
);

CREATE INDEX idx_module_features_module ON module_features(module_id);
CREATE INDEX idx_module_features_active ON module_features(module_id, is_active, sort_order);

COMMENT ON TABLE module_features IS 'Global feature templates - define pages/features within modules';
COMMENT ON COLUMN module_features.pbi_report IS 'Expected PowerBI report name for auto-linking';

-- ============================================
-- 3. TRIGGERS
-- ============================================

-- Create update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_features_updated_at
  BEFORE UPDATE ON module_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. SEED DATA - Based on Your Screenshots
-- ============================================

-- Insert global modules (what you showed me in screenshots)
INSERT INTO modules (name, display_name, description, sort_order, is_active) VALUES
  ('AAF', 'AAF', 'Apprenticeship Achievement Framework', 1, true),
  ('Compliance Leader', 'Compliance Leader', 'Compliance oversight and monitoring', 2, true),
  ('Funding Information', 'Funding Information', 'Funding status and information', 3, true),
  ('Internal Quality Assurer', 'Internal Quality Assurer', 'IQA dashboard and tools', 4, true),
  ('Learning Support Coach', 'Learning Support Coach', 'Learning support activities', 5, true),
  ('Operations Leader', 'Operations Leader', 'Operations management dashboard', 6, true),
  ('Operations Manager', 'Operations Manager', 'Operations manager tools', 7, true),
  ('Quality Leader', 'Quality Leader', 'Quality leadership dashboard', 8, true),
  ('Quality Manager', 'Quality Manager', 'Quality management tools', 9, true),
  ('QAR Scenarios', 'QAR Scenarios', 'QAR scenario analysis', 10, true),
  ('Sales Leader', 'Sales Leader', 'Sales leadership dashboard', 11, true),
  ('Salesperson', 'Salesperson', 'Sales rep dashboard', 12, true),
  ('Senior Leader', 'Senior Leader', 'Senior leadership overview', 13, true),
  ('Skills Coach', 'Skills Coach', 'Skills coach dashboard', 14, true)
ON CONFLICT (name) DO NOTHING;

-- Example features for Quality Leader module
-- (You'll add more based on your actual reports)
INSERT INTO module_features (
  module_id,
  page_name_or_id,
  display_name,
  tab_name,
  pbi_report,
  sort_order
)
SELECT
  m.id,
  'Quality Leader Dashboard',
  'Quality Leader Dashboard',
  'Dashboard',
  'Quality Leader V1.0 Release',
  1
FROM modules m WHERE m.name = 'Quality Leader'
ON CONFLICT DO NOTHING;

INSERT INTO module_features (
  module_id,
  page_name_or_id,
  display_name,
  tab_name,
  pbi_report,
  sort_order
)
SELECT
  m.id,
  'Quality Manager Dashboard',
  'Quality Manager Dashboard',
  'Manager',
  'Quality Manager V1.0 Release',
  2
FROM modules m WHERE m.name = 'Quality Leader'
ON CONFLICT DO NOTHING;

-- Example for Operations Leader
INSERT INTO module_features (
  module_id,
  page_name_or_id,
  display_name,
  tab_name,
  pbi_report,
  sort_order
)
SELECT
  m.id,
  'Operations Leader Dashboard',
  'Operations Leader Dashboard',
  'Dashboard',
  'Operations Leader V1.0 Release',
  1
FROM modules m WHERE m.name = 'Operations Leader'
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. HELPER VIEWS
-- ============================================

CREATE OR REPLACE VIEW v_modules_with_features AS
SELECT
  m.id AS module_id,
  m.name AS module_name,
  m.display_name AS module_display_name,
  m.sort_order AS module_sort_order,
  m.is_active AS module_active,
  mf.id AS feature_id,
  mf.page_name_or_id,
  mf.display_name AS feature_display_name,
  mf.tab_name,
  mf.pbi_report,
  mf.sort_order AS feature_sort_order,
  mf.enable_ai_insights,
  mf.is_active AS feature_active
FROM modules m
LEFT JOIN module_features mf ON mf.module_id = m.id
ORDER BY m.sort_order, mf.sort_order;

COMMENT ON VIEW v_modules_with_features IS 'Complete view of modules with their features';

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- View all modules and their features
-- SELECT * FROM v_modules_with_features WHERE module_active = true;

-- Get all features for a specific module
-- SELECT * FROM module_features WHERE module_id = (SELECT id FROM modules WHERE name = 'Quality Leader');

-- Update a feature
-- UPDATE module_features SET page_name_or_id = 'New Page Name' WHERE id = 'feature-id';
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
-- ============================================
-- ROLE-BASED MODULE FEATURES
-- ============================================
-- Implements the smart navigation system:
-- - Modules are categories (Operations, Quality, Sales, etc.)
-- - Each module contains role-specific pages
-- - Users only see pages for their assigned roles
-- - "Immediate Priorities" is available to everyone
--
-- Example:
-- - Operations module contains: Ops Leader, Ops Manager, Skills Coach pages
-- - User with "Skills Coach" role only sees Skills Coach page
-- - User with "Ops Leader" role only sees Ops Leader page

-- ============================================
-- 1. ROLE MODULE FEATURES
-- ============================================

CREATE TABLE IF NOT EXISTS role_module_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  organization_module_id UUID REFERENCES organization_modules(id) ON DELETE CASCADE NOT NULL,
  organization_report_id UUID REFERENCES organization_powerbi_reports(id) ON DELETE CASCADE,

  -- What to display
  page_name_or_id TEXT NOT NULL, -- PowerBI page name or ID
  display_name TEXT, -- Display name in navigation
  tab_name TEXT, -- Tab label shown to user

  -- Configuration
  report_filter JSONB DEFAULT '{}',
  enable_ai_insights BOOLEAN DEFAULT false,
  prompt TEXT,

  -- Special flags
  is_home_page BOOLEAN DEFAULT false, -- Is this the "Immediate Priorities" page?
  is_always_visible BOOLEAN DEFAULT false, -- Visible to all roles in this module?

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique page per role per module
  UNIQUE(role_id, organization_module_id, page_name_or_id)
);

CREATE INDEX idx_role_features_role ON role_module_features(role_id);
CREATE INDEX idx_role_features_module ON role_module_features(organization_module_id);
CREATE INDEX idx_role_features_report ON role_module_features(organization_report_id);
CREATE INDEX idx_role_features_active ON role_module_features(is_active, sort_order);
CREATE INDEX idx_role_features_home ON role_module_features(is_home_page) WHERE is_home_page = true;

COMMENT ON TABLE role_module_features IS 'Role-specific features within modules - implements smart role-based navigation';
COMMENT ON COLUMN role_module_features.is_home_page IS 'If true, this is the home/immediate priorities page visible to all';
COMMENT ON COLUMN role_module_features.is_always_visible IS 'If true, visible to all roles within this module';

-- ============================================
-- 2. MODULE CATEGORIES (Optional - for grouping)
-- ============================================

-- Add category field to modules for better organization
ALTER TABLE organization_modules
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

COMMENT ON COLUMN organization_modules.category IS 'Module category: operations, quality, sales, compliance, etc.';
COMMENT ON COLUMN organization_modules.icon IS 'Icon name or emoji for UI display';

-- ============================================
-- 3. NAVIGATION GENERATION FUNCTION
-- ============================================

-- Function to get navigation structure for a specific user
CREATE OR REPLACE FUNCTION get_user_navigation(user_id_param UUID)
RETURNS TABLE (
  module_id UUID,
  module_name TEXT,
  module_display_name TEXT,
  module_category TEXT,
  module_icon TEXT,
  module_sort_order INTEGER,
  feature_id UUID,
  feature_page_name TEXT,
  feature_display_name TEXT,
  feature_tab_name TEXT,
  report_id UUID,
  powerbi_report_id TEXT,
  powerbi_workspace_id TEXT,
  is_home_page BOOLEAN,
  feature_sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.id AS module_id,
    om.name AS module_name,
    om.display_name AS module_display_name,
    om.category AS module_category,
    om.icon AS module_icon,
    om.sort_order AS module_sort_order,
    rmf.id AS feature_id,
    rmf.page_name_or_id AS feature_page_name,
    rmf.display_name AS feature_display_name,
    rmf.tab_name AS feature_tab_name,
    opr.id AS report_id,
    opr.powerbi_report_id,
    opr.powerbi_workspace_id,
    rmf.is_home_page,
    rmf.sort_order AS feature_sort_order
  FROM users u
  JOIN organizations org ON org.id = u.organization_id
  JOIN organization_modules om ON om.organization_id = org.id
  JOIN role_module_features rmf ON rmf.organization_module_id = om.id
  LEFT JOIN organization_powerbi_reports opr ON opr.id = rmf.organization_report_id
  WHERE u.id = user_id_param
    AND om.is_active = true
    AND rmf.is_active = true
    AND (
      -- User has this role
      rmf.role_id = u.role_id
      OR
      -- Or it's a universal feature (home page)
      rmf.is_always_visible = true
    )
  ORDER BY om.sort_order, rmf.sort_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_navigation IS 'Generates complete navigation structure for a user based on their role';

-- ============================================
-- 4. CHECK MODULE VISIBILITY FOR USER
-- ============================================

-- Function to check if user should see a specific module
CREATE OR REPLACE FUNCTION user_can_access_module(user_id_param UUID, module_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- Check if user has any features in this module for their role
  SELECT EXISTS(
    SELECT 1
    FROM users u
    JOIN role_module_features rmf ON rmf.organization_module_id = module_id_param
    WHERE u.id = user_id_param
      AND (
        rmf.role_id = u.role_id
        OR rmf.is_always_visible = true
      )
      AND rmf.is_active = true
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_can_access_module IS 'Checks if a user has access to any features in a module';

-- ============================================
-- 5. HELPER VIEWS
-- ============================================

-- View showing complete role-based feature mappings
CREATE OR REPLACE VIEW v_role_module_features AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  om.id AS module_id,
  om.name AS module_name,
  om.display_name AS module_display_name,
  om.category AS module_category,
  r.id AS role_id,
  r.name AS role_name,
  rmf.id AS feature_id,
  rmf.page_name_or_id,
  rmf.display_name AS feature_display_name,
  rmf.tab_name,
  rmf.is_home_page,
  rmf.is_always_visible,
  opr.id AS deployed_report_id,
  opr.powerbi_report_id,
  opr.powerbi_workspace_id,
  pr.name AS template_report_name,
  rmf.sort_order,
  rmf.is_active
FROM organizations o
JOIN organization_modules om ON om.organization_id = o.id
JOIN role_module_features rmf ON rmf.organization_module_id = om.id
JOIN roles r ON r.id = rmf.role_id
LEFT JOIN organization_powerbi_reports opr ON opr.id = rmf.organization_report_id
LEFT JOIN powerbi_reports pr ON pr.id = opr.template_report_id
ORDER BY o.name, om.sort_order, r.name, rmf.sort_order;

COMMENT ON VIEW v_role_module_features IS 'Complete view of role-based feature mappings across all organizations';

-- ============================================
-- 6. SEED DATA - Map Roles to Modules
-- ============================================

-- Example: Operations module contains multiple role-specific pages
-- This would be run after organization setup

-- Note: These are just examples - actual setup happens per organization
-- through the admin UI

/*
Example mapping for "Operations" module:

INSERT INTO role_module_features (
  role_id,
  organization_module_id,
  organization_report_id,
  page_name_or_id,
  display_name,
  tab_name,
  sort_order
) VALUES
  -- Operations Leader
  (
    (SELECT id FROM roles WHERE name = 'Operations Leader'),
    (SELECT id FROM organization_modules WHERE name = 'Operations' AND organization_id = 'org-id'),
    (SELECT id FROM organization_powerbi_reports WHERE ... ),
    'Operations Leader Dashboard',
    'Operations Leader Dashboard',
    'Dashboard',
    1
  ),
  -- Operations Manager
  (
    (SELECT id FROM roles WHERE name = 'Operations Manager'),
    (SELECT id FROM organization_modules WHERE name = 'Operations' AND organization_id = 'org-id'),
    (SELECT id FROM organization_powerbi_reports WHERE ... ),
    'Operations Manager Detail',
    'Operations Manager Detail',
    'Manager View',
    2
  ),
  -- Skills Coach
  (
    (SELECT id FROM roles WHERE name = 'Skills Coach'),
    (SELECT id FROM organization_modules WHERE name = 'Operations' AND organization_id = 'org-id'),
    (SELECT id FROM organization_powerbi_reports WHERE ... ),
    'Skills Coach Dashboard',
    'Skills Coach Dashboard',
    'My Dashboard',
    3
  );

-- Home page (visible to ALL roles)
INSERT INTO role_module_features (
  role_id,
  organization_module_id,
  page_name_or_id,
  display_name,
  tab_name,
  is_home_page,
  is_always_visible,
  sort_order
) VALUES
  (
    (SELECT id FROM roles WHERE name = 'Operations Leader'), -- Need to insert for each role
    (SELECT id FROM organization_modules WHERE name = 'Home' AND organization_id = 'org-id'),
    'Immediate Priorities',
    'Immediate Priorities',
    'Home',
    true,
    true,
    1
  );
*/

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Create update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_role_module_features_updated_at
  BEFORE UPDATE ON role_module_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE role_module_features ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Get navigation for a specific user
-- SELECT * FROM get_user_navigation('user-id-here');

-- Check if user can access a module
-- SELECT user_can_access_module('user-id', 'module-id');

-- View all role-based features for an organization
-- SELECT * FROM v_role_module_features WHERE organization_name = 'Demo1';

-- Get features for a specific role in a module
-- SELECT * FROM role_module_features
-- WHERE role_id = 'ops-leader-role-id'
--   AND organization_module_id = 'operations-module-id';
