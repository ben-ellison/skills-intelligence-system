-- ============================================
-- MIGRATION 028: Fix get_module_tabs_for_tenant to return template_report_id
-- ============================================
-- The function needs to return template_report_id so the frontend can pass it
-- to the embed token API which looks up the deployed report by template_report_id

-- Drop the existing function first (required to change return type)
DROP FUNCTION IF EXISTS get_module_tabs_for_tenant(UUID, UUID, TEXT);

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
  template_report_id UUID, -- NEW: Template report ID for embed token lookup
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
      opr.template_report_id, -- NEW
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
      opr.template_report_id, -- NEW
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
      opr.template_report_id, -- NEW
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

COMMENT ON FUNCTION get_module_tabs_for_tenant IS 'Returns effective tabs for a module (global defaults + tenant overrides) with template_report_id for embed token lookup';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 028 completed successfully!';
  RAISE NOTICE '✓ Updated get_module_tabs_for_tenant to return template_report_id';
  RAISE NOTICE '✓ Frontend can now properly look up deployed reports for embed tokens';
END $$;
