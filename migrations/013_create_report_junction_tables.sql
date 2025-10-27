-- ============================================
-- MIGRATION 013: Create Report Junction Tables
-- ============================================
-- Creates the many-to-many relationship tables between:
-- 1. Modules and Reports (module_powerbi_reports)
-- 2. Roles and Reports (role_powerbi_reports)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 1. MODULE_POWERBI_REPORTS (Module-to-Report Junction)
-- ============================================

CREATE TABLE IF NOT EXISTS module_powerbi_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign Keys
  module_id UUID REFERENCES organization_modules(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE NOT NULL,

  -- Display Configuration
  sort_order INTEGER DEFAULT 0, -- Order reports appear within module
  custom_name TEXT, -- Optional: Override report name for this module
  custom_description TEXT, -- Optional: Module-specific description

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one report can only be added once per module
  UNIQUE(module_id, report_id)
);

COMMENT ON TABLE module_powerbi_reports IS 'Links PowerBI reports to organization modules - defines which reports appear in which modules';
COMMENT ON COLUMN module_powerbi_reports.module_id IS 'References organization_modules (org-specific module instance)';
COMMENT ON COLUMN module_powerbi_reports.report_id IS 'References powerbi_reports (template report)';
COMMENT ON COLUMN module_powerbi_reports.sort_order IS 'Display order within the module';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_module_reports_module ON module_powerbi_reports(module_id);
CREATE INDEX IF NOT EXISTS idx_module_reports_report ON module_powerbi_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_module_reports_active ON module_powerbi_reports(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_module_powerbi_reports_updated_at ON module_powerbi_reports;
CREATE TRIGGER update_module_powerbi_reports_updated_at
  BEFORE UPDATE ON module_powerbi_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. ROLE_POWERBI_REPORTS (Role-to-Report Junction)
-- ============================================

CREATE TABLE IF NOT EXISTS role_powerbi_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign Keys
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE NOT NULL,

  -- Access Control
  can_view BOOLEAN DEFAULT true, -- Can view the report
  can_export BOOLEAN DEFAULT false, -- Can export data
  can_share BOOLEAN DEFAULT false, -- Can share with others

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one report can only be assigned once per role
  UNIQUE(role_id, report_id)
);

COMMENT ON TABLE role_powerbi_reports IS 'Links PowerBI reports to roles - defines which roles can access which reports';
COMMENT ON COLUMN role_powerbi_reports.role_id IS 'References roles (global role)';
COMMENT ON COLUMN role_powerbi_reports.report_id IS 'References powerbi_reports (template report)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_reports_role ON role_powerbi_reports(role_id);
CREATE INDEX IF NOT EXISTS idx_role_reports_report ON role_powerbi_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_role_reports_active ON role_powerbi_reports(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_role_powerbi_reports_updated_at ON role_powerbi_reports;
CREATE TRIGGER update_role_powerbi_reports_updated_at
  BEFORE UPDATE ON role_powerbi_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 013 completed successfully!';
  RAISE NOTICE '✓ Created module_powerbi_reports table';
  RAISE NOTICE '✓ Created role_powerbi_reports table';
  RAISE NOTICE '✓ Added indexes and triggers';
END $$;
