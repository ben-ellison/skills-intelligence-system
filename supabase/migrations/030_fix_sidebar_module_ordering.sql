-- ============================================
-- MIGRATION 030: Fix Sidebar Module Ordering
-- ============================================
-- The get_modules_for_organization function was returning tenant-specific
-- modules without global_module_id, which were incorrectly created during
-- workspace scanning. This caused the sidebar to show modules alphabetically
-- instead of by sort_order.
--
-- Fix: Update the function to ONLY return modules that either:
-- 1. Come from global_modules (with proper overrides), OR
-- 2. Are explicitly tenant-created modules WITH intentional configuration
--
-- For now, we'll filter out organization_modules that have NULL global_module_id
-- since the current auto-deploy process always sets global_module_id.

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

  -- Note: Removed the UNION ALL section for tenant-specific modules
  -- because the current implementation should always have global_module_id set.
  -- If we need truly custom tenant modules in the future, they should be
  -- explicitly configured with proper sort_order and flags.

  ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_modules_for_organization IS 'Returns effective modules for an organization (global defaults + tenant overrides). Excludes incorrectly created tenant modules without global references.';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 030 completed successfully!';
  RAISE NOTICE '✓ Updated get_modules_for_organization() to exclude orphaned tenant modules';
  RAISE NOTICE '✓ Sidebar should now display modules in correct sort_order';
END $$;
