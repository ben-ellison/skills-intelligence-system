-- ============================================
-- MIGRATION 029: Fix duplicate tabs in get_module_tabs_for_tenant
-- ============================================
-- The tenant-added tabs query was returning tabs that also exist as global tabs
-- causing duplicates. We need to exclude tenant tabs that match global tabs.

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
  report_id TEXT,
  workspace_id TEXT,
  page_name TEXT,
  template_report_id UUID,
  source TEXT
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
      opr.template_report_id,
      'tenant'::TEXT as source
    FROM tenant_module_tabs tmt
    JOIN organization_powerbi_reports opr ON tmt.organization_report_id = opr.id
    WHERE tmt.organization_id = p_organization_id
      AND tmt.module_id = p_module_id
      AND tmt.is_active = true
      AND tmt.override_mode = 'replace'
    ORDER BY tmt.sort_order;
  ELSE
    -- Return combined global + tenant tabs (excluding hidden and duplicates)
    RETURN QUERY
    -- Global tabs (not hidden by tenant)
    SELECT
      mt.id,
      mt.tab_name,
      mt.sort_order,
      opr.powerbi_report_id as report_id,
      opr.powerbi_workspace_id as workspace_id,
      mt.page_name,
      opr.template_report_id,
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

    -- Tenant-added tabs (only truly new tabs, not ones that match global tabs)
    SELECT
      tmt.id,
      tmt.tab_name,
      tmt.sort_order,
      opr.powerbi_report_id as report_id,
      opr.powerbi_workspace_id as workspace_id,
      tmt.page_name,
      opr.template_report_id,
      'tenant'::TEXT as source
    FROM tenant_module_tabs tmt
    JOIN organization_powerbi_reports opr ON tmt.organization_report_id = opr.id
    WHERE tmt.organization_id = p_organization_id
      AND tmt.module_id = p_module_id
      AND tmt.is_active = true
      AND tmt.override_mode = 'add'
      -- NEW: Exclude tabs that match global tabs by report and page
      AND NOT EXISTS (
        SELECT 1 FROM module_tabs mt
        JOIN powerbi_reports pr ON mt.report_id = pr.id
        WHERE mt.module_name = p_module_name
          AND mt.is_active = true
          AND pr.id = opr.template_report_id
          AND COALESCE(mt.page_name, '') = COALESCE(tmt.page_name, '')
      )

    ORDER BY sort_order;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_module_tabs_for_tenant IS 'Returns effective tabs for a module without duplicates';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 029 completed successfully!';
  RAISE NOTICE '✓ Fixed duplicate tabs in get_module_tabs_for_tenant';
  RAISE NOTICE '✓ Tenant tabs now exclude duplicates of global tabs';
END $$;
