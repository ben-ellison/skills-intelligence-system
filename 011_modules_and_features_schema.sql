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
