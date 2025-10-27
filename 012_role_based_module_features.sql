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
