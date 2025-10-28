-- ============================================
-- MIGRATION 016: Create Global Modules Configuration
-- ============================================
-- Creates table for global default module configuration and
-- updates organization_modules to support overrides

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. GLOBAL_MODULES (Platform-wide Defaults)
-- ============================================
-- Defines the default modules that appear for all tenants
-- Super Admin configures these in platform settings

CREATE TABLE IF NOT EXISTS global_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Module Identification
  name TEXT UNIQUE NOT NULL, -- Unique identifier (e.g., 'operations', 'quality', 'senior-leader')
  display_name TEXT NOT NULL, -- Display name shown in sidebar (e.g., 'Operations', 'Quality & Curriculum')

  -- Visual Configuration
  icon_name TEXT, -- Lucide icon name (e.g., 'Wrench', 'CheckSquare', 'User')
  description TEXT, -- Optional description for admin reference

  -- Organization
  sort_order INTEGER DEFAULT 0, -- Order modules appear in sidebar (top to bottom)
  module_group TEXT, -- Group identifier for collapsible sections (e.g., 'core', 'analysis', 'admin')

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE global_modules IS 'Global default module configuration - applies to all tenants unless overridden';
COMMENT ON COLUMN global_modules.name IS 'Unique module identifier (matches organization_modules.name)';
COMMENT ON COLUMN global_modules.display_name IS 'Display name shown in tenant sidebar';
COMMENT ON COLUMN global_modules.icon_name IS 'Lucide React icon name for the module';
COMMENT ON COLUMN global_modules.module_group IS 'Group for organizing modules into collapsible sections';
COMMENT ON COLUMN global_modules.sort_order IS 'Display order in sidebar (lower = higher)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_global_modules_active ON global_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_global_modules_sort ON global_modules(sort_order);
CREATE INDEX IF NOT EXISTS idx_global_modules_group ON global_modules(module_group);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_global_modules_updated_at ON global_modules;
CREATE TRIGGER update_global_modules_updated_at
  BEFORE UPDATE ON global_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. UPDATE ORGANIZATION_MODULES
-- ============================================
-- Add columns to support tenant-specific overrides

-- Add reference to global module template
ALTER TABLE organization_modules
ADD COLUMN IF NOT EXISTS global_module_id UUID REFERENCES global_modules(id) ON DELETE CASCADE;

-- Add override mode
ALTER TABLE organization_modules
ADD COLUMN IF NOT EXISTS override_mode TEXT DEFAULT 'default';
-- 'default' = use global settings
-- 'custom' = custom configuration for this tenant
-- 'hidden' = hide this global module for this tenant

-- Add custom icon override
ALTER TABLE organization_modules
ADD COLUMN IF NOT EXISTS custom_icon_name TEXT;

-- Add custom group override
ALTER TABLE organization_modules
ADD COLUMN IF NOT EXISTS custom_module_group TEXT;

COMMENT ON COLUMN organization_modules.global_module_id IS 'References global module template (null = tenant-specific module)';
COMMENT ON COLUMN organization_modules.override_mode IS 'How this module relates to global: default, custom, or hidden';
COMMENT ON COLUMN organization_modules.custom_icon_name IS 'Override icon for this tenant';
COMMENT ON COLUMN organization_modules.custom_module_group IS 'Override module group for this tenant';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_modules_global_id ON organization_modules(global_module_id);
CREATE INDEX IF NOT EXISTS idx_org_modules_override_mode ON organization_modules(override_mode);

-- ============================================
-- 3. HELPER FUNCTION: Get Modules for Organization
-- ============================================
-- Returns the effective modules for a specific organization
-- Combines global defaults with tenant-specific overrides

CREATE OR REPLACE FUNCTION get_modules_for_organization(
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  display_name TEXT,
  icon_name TEXT,
  module_group TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  source TEXT -- 'global' | 'custom' | 'tenant'
) AS $$
BEGIN
  RETURN QUERY
  -- Global modules (not hidden by tenant)
  SELECT
    COALESCE(om.id, gm.id) as id,
    gm.name,
    COALESCE(om.display_name, gm.display_name) as display_name,
    COALESCE(om.custom_icon_name, gm.icon_name) as icon_name,
    COALESCE(om.custom_module_group, gm.module_group) as module_group,
    COALESCE(om.sort_order, gm.sort_order) as sort_order,
    COALESCE(om.is_active, gm.is_active) as is_active,
    CASE
      WHEN om.override_mode = 'custom' THEN 'custom'::TEXT
      WHEN om.id IS NOT NULL THEN 'global'::TEXT
      ELSE 'global'::TEXT
    END as source
  FROM global_modules gm
  LEFT JOIN organization_modules om ON (
    om.global_module_id = gm.id
    AND om.organization_id = p_organization_id
  )
  WHERE gm.is_active = true
    AND (om.override_mode IS NULL OR om.override_mode != 'hidden')

  UNION ALL

  -- Tenant-specific modules (no global template)
  SELECT
    om.id,
    om.name,
    om.display_name,
    om.custom_icon_name as icon_name,
    om.custom_module_group as module_group,
    om.sort_order,
    om.is_active,
    'tenant'::TEXT as source
  FROM organization_modules om
  WHERE om.organization_id = p_organization_id
    AND om.global_module_id IS NULL
    AND om.is_active = true

  ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_modules_for_organization IS 'Returns effective modules for an organization (global defaults + tenant overrides)';

-- ============================================
-- 4. SEED DEFAULT GLOBAL MODULES
-- ============================================
-- Insert the default modules that should appear for all tenants

INSERT INTO global_modules (name, display_name, icon_name, module_group, sort_order, is_active) VALUES
  ('senior-leader', 'Senior Leadership', 'User', 'core', 0, true),
  ('operations', 'Operations', 'Wrench', 'core', 1, true),
  ('quality', 'Quality & Curriculum', 'CheckSquare', 'core', 2, true),
  ('compliance', 'Compliance', 'FileText', 'core', 3, true),
  ('sales', 'Sales', 'TrendingUp', 'core', 4, true),
  ('aaf', 'Accountability Framework', 'BarChart3', 'analysis', 5, true),
  ('qar', 'QAR Information', 'FileBarChart', 'analysis', 6, true),
  ('funding', 'Funding Information', 'Coins', 'analysis', 7, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 016 completed successfully!';
  RAISE NOTICE '✓ Created global_modules table';
  RAISE NOTICE '✓ Updated organization_modules with override columns';
  RAISE NOTICE '✓ Created get_modules_for_organization() helper function';
  RAISE NOTICE '✓ Seeded 8 default global modules';
END $$;
