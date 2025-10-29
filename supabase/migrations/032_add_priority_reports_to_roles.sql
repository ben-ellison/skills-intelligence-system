-- ============================================
-- MIGRATION 032: Add Immediate Priority Reports to Roles
-- ============================================
-- Links each global role to its "Immediate Priorities" PowerBI report
-- This allows the Summary page to show role-specific priority dashboards

-- Add priority report reference to global_roles
ALTER TABLE global_roles
ADD COLUMN IF NOT EXISTS priority_report_id UUID REFERENCES powerbi_reports(id) ON DELETE SET NULL;

COMMENT ON COLUMN global_roles.priority_report_id IS 'PowerBI report shown in Immediate Priorities tab for this role';

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_global_roles_priority_report ON global_roles(priority_report_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 032 completed successfully!';
  RAISE NOTICE '✓ Added priority_report_id to global_roles table';
  RAISE NOTICE '✓ Global roles can now be linked to Immediate Priorities reports';
  RAISE NOTICE '✓ Next: Configure roles in Super Admin > Global Roles';
END $$;
