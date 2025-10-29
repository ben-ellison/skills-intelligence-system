-- ============================================
-- MIGRATION 031: Force Global Module Sort Order
-- ============================================
-- Migration 030 still allowed organization_modules.sort_order to override
-- global_modules.sort_order using COALESCE. This caused "CORE MODULES" to
-- appear alphabetically because the auto-deploy process set sort_order values
-- on organization_modules.
--
-- Fix: Always use global_modules.sort_order unless override_mode = 'custom'

DROP FUNCTION IF EXISTS get_modules_for_organization(UUID);

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
    -- KEY FIX: Only use tenant sort_order if override_mode = 'custom', otherwise always use global
    CASE
      WHEN om.override_mode = 'custom' THEN COALESCE(om.sort_order, gm.sort_order)
      ELSE gm.sort_order
    END as sort_order,
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

  ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_modules_for_organization IS 'Returns effective modules for an organization with proper sort_order inheritance from global_modules';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 031 completed successfully!';
  RAISE NOTICE '✓ Updated get_modules_for_organization() to always use global sort_order';
  RAISE NOTICE '✓ Sidebar modules will now display in correct order (0-6)';
  RAISE NOTICE '✓ Only custom override modules can have different sort_order';
END $$;
