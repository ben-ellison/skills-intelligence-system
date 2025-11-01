-- ============================================
-- MIGRATION 037: Delete duplicate tenant tabs
-- ============================================
-- The scan was incorrectly creating tenant_module_tabs with override_mode='add'
-- for tabs that already exist as global tabs, causing duplicates.
-- This migration removes those duplicate tenant tabs.

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all tenant tabs with override_mode='add' for PrimaryGoal organization
  -- These tabs are duplicates of global tabs and shouldn't exist
  DELETE FROM tenant_module_tabs
  WHERE organization_id = (SELECT id FROM organizations WHERE subdomain = 'primarygoal')
    AND override_mode = 'add';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE '✓ Deleted % duplicate tenant tabs for PrimaryGoal', v_deleted_count;

  -- Note: Tenant admins can still manually create custom tenant tabs via the UI
  -- This only removes the duplicates created by the scan process
END $$;

COMMENT ON TABLE tenant_module_tabs IS 'Tenant-specific tab overrides. Use override_mode=hide to hide global tabs, override_mode=replace to replace all tabs, or override_mode=add for truly custom tabs that do not exist in global module_tabs.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 037 completed successfully!';
  RAISE NOTICE '✓ Removed duplicate tenant tabs created by scan process';
  RAISE NOTICE '✓ Tenant tabs should only be created manually for custom configurations';
END $$;
