-- ============================================
-- MIGRATION 015: Create Module Tabs Configuration
-- ============================================
-- Creates tables for configuring PowerBI tabs within modules:
-- 1. Global default tabs (platform-wide, managed by Super Admin)
-- 2. Tenant-specific tab overrides (managed by Superuser)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MODULE_TABS (Global Default Tabs)
-- ============================================
-- Defines the default tabs that appear for all tenants
-- Super Admin configures these in platform settings

CREATE TABLE IF NOT EXISTS module_tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Module Configuration
  module_name TEXT NOT NULL, -- References the module name (e.g., 'operations', 'quality', etc.)

  -- Tab Display
  tab_name TEXT NOT NULL, -- Display name for the tab (e.g., "Overview", "KPIs", "Trends")
  sort_order INTEGER DEFAULT 0, -- Order tabs appear left to right

  -- PowerBI Configuration
  report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE NOT NULL, -- Which report to show
  page_name TEXT, -- Optional: Specific page within the report (e.g., "ReportSection1234")

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique tab names within a module
  UNIQUE(module_name, tab_name)
);

COMMENT ON TABLE module_tabs IS 'Global default tab configuration for modules - applies to all tenants unless overridden';
COMMENT ON COLUMN module_tabs.module_name IS 'Module identifier (matches organization_modules.name)';
COMMENT ON COLUMN module_tabs.tab_name IS 'Display name shown on the tab';
COMMENT ON COLUMN module_tabs.report_id IS 'Template PowerBI report to display';
COMMENT ON COLUMN module_tabs.page_name IS 'Optional: Specific page name within the report to show';
COMMENT ON COLUMN module_tabs.sort_order IS 'Display order of tabs (lower = further left)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_tabs_module ON module_tabs(module_name);
CREATE INDEX IF NOT EXISTS idx_module_tabs_report ON module_tabs(report_id);
CREATE INDEX IF NOT EXISTS idx_module_tabs_active ON module_tabs(is_active);
CREATE INDEX IF NOT EXISTS idx_module_tabs_sort ON module_tabs(module_name, sort_order);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_module_tabs_updated_at ON module_tabs;
CREATE TRIGGER update_module_tabs_updated_at
  BEFORE UPDATE ON module_tabs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. TENANT_MODULE_TABS (Tenant-Specific Overrides)
-- ============================================
-- Allows specific tenants to override the global default tabs
-- Superuser configures these for individual organizations

CREATE TABLE IF NOT EXISTS tenant_module_tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization & Module
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES organization_modules(id) ON DELETE CASCADE NOT NULL,

  -- Tab Display
  tab_name TEXT NOT NULL, -- Display name for the tab
  sort_order INTEGER DEFAULT 0, -- Order tabs appear left to right

  -- PowerBI Configuration
  organization_report_id UUID REFERENCES organization_powerbi_reports(id) ON DELETE CASCADE NOT NULL, -- Which deployed report to show
  page_name TEXT, -- Optional: Specific page within the report

  -- Override Control
  override_mode TEXT DEFAULT 'add', -- 'add' (add to defaults) | 'replace' (replace all defaults) | 'hide' (hide a default tab)
  hidden_global_tab_id UUID REFERENCES module_tabs(id) ON DELETE CASCADE, -- If hiding a global tab, reference it

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique tab names within an organization's module
  UNIQUE(organization_id, module_id, tab_name)
);

COMMENT ON TABLE tenant_module_tabs IS 'Tenant-specific tab overrides - allows customization beyond global defaults';
COMMENT ON COLUMN tenant_module_tabs.organization_id IS 'Which organization this override applies to';
COMMENT ON COLUMN tenant_module_tabs.module_id IS 'Specific organization module instance';
COMMENT ON COLUMN tenant_module_tabs.organization_report_id IS 'Deployed report instance for this organization';
COMMENT ON COLUMN tenant_module_tabs.override_mode IS 'How this interacts with global defaults: add, replace, or hide';
COMMENT ON COLUMN tenant_module_tabs.hidden_global_tab_id IS 'If override_mode=hide, which global tab to hide';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_module_tabs_org ON tenant_module_tabs(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_tabs_module ON tenant_module_tabs(module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_tabs_report ON tenant_module_tabs(organization_report_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_tabs_active ON tenant_module_tabs(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_module_tabs_sort ON tenant_module_tabs(organization_id, module_id, sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenant_module_tabs_updated_at ON tenant_module_tabs;
CREATE TRIGGER update_tenant_module_tabs_updated_at
  BEFORE UPDATE ON tenant_module_tabs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. HELPER FUNCTION: Get Tabs for Organization Module
-- ============================================
-- Returns the effective tabs for a specific organization's module
-- Combines global defaults with tenant-specific overrides

CREATE OR REPLACE FUNCTION get_module_tabs_for_tenant(
  p_organization_id UUID,
  p_module_id UUID,
  p_module_name TEXT
)
RETURNS TABLE (
  id UUID,
  tab_name TEXT,
  sort_order INTEGER,
  report_id TEXT, -- PowerBI report ID (from organization_powerbi_reports)
  workspace_id TEXT, -- PowerBI workspace ID
  page_name TEXT,
  source TEXT -- 'global' | 'tenant'
) AS $$
BEGIN
  -- Check if tenant has 'replace' mode overrides
  IF EXISTS (
    SELECT 1 FROM tenant_module_tabs
    WHERE organization_id = p_organization_id
      AND module_id = p_module_id
      AND override_mode = 'replace'
      AND is_active = true
  ) THEN
    -- Return only tenant tabs (replace mode)
    RETURN QUERY
    SELECT
      tmt.id,
      tmt.tab_name,
      tmt.sort_order,
      opr.powerbi_report_id as report_id,
      opr.powerbi_workspace_id as workspace_id,
      tmt.page_name,
      'tenant'::TEXT as source
    FROM tenant_module_tabs tmt
    JOIN organization_powerbi_reports opr ON tmt.organization_report_id = opr.id
    WHERE tmt.organization_id = p_organization_id
      AND tmt.module_id = p_module_id
      AND tmt.is_active = true
      AND tmt.override_mode = 'replace'
    ORDER BY tmt.sort_order;
  ELSE
    -- Return combined global + tenant tabs (excluding hidden)
    RETURN QUERY
    -- Global tabs (not hidden by tenant)
    SELECT
      mt.id,
      mt.tab_name,
      mt.sort_order,
      opr.powerbi_report_id as report_id,
      opr.powerbi_workspace_id as workspace_id,
      mt.page_name,
      'global'::TEXT as source
    FROM module_tabs mt
    JOIN powerbi_reports pr ON mt.report_id = pr.id
    JOIN organization_powerbi_reports opr ON (
      opr.template_report_id = pr.id
      AND opr.organization_id = p_organization_id
      AND opr.deployment_status = 'active'
    )
    WHERE mt.module_name = p_module_name
      AND mt.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM tenant_module_tabs tmt
        WHERE tmt.organization_id = p_organization_id
          AND tmt.module_id = p_module_id
          AND tmt.override_mode = 'hide'
          AND tmt.hidden_global_tab_id = mt.id
          AND tmt.is_active = true
      )

    UNION ALL

    -- Tenant-added tabs
    SELECT
      tmt.id,
      tmt.tab_name,
      tmt.sort_order,
      opr.powerbi_report_id as report_id,
      opr.powerbi_workspace_id as workspace_id,
      tmt.page_name,
      'tenant'::TEXT as source
    FROM tenant_module_tabs tmt
    JOIN organization_powerbi_reports opr ON tmt.organization_report_id = opr.id
    WHERE tmt.organization_id = p_organization_id
      AND tmt.module_id = p_module_id
      AND tmt.is_active = true
      AND tmt.override_mode = 'add'

    ORDER BY sort_order;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_module_tabs_for_tenant IS 'Returns effective tabs for an organization module (global defaults + tenant overrides)';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 015 completed successfully!';
  RAISE NOTICE '✓ Created module_tabs table (global defaults)';
  RAISE NOTICE '✓ Created tenant_module_tabs table (tenant overrides)';
  RAISE NOTICE '✓ Created get_module_tabs_for_tenant() helper function';
  RAISE NOTICE '✓ Added indexes and triggers';
END $$;
