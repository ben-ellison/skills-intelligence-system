-- Check PrimaryGoal organization workspace configuration
-- This is a diagnostic query to help troubleshoot PowerBI workspace scanning issues

SELECT
  id,
  name,
  subdomain,
  powerbi_workspace_id,
  powerbi_workspace_name,
  created_at,
  CASE
    WHEN powerbi_workspace_id IS NULL THEN 'NOT CONFIGURED'
    ELSE 'CONFIGURED'
  END as workspace_status
FROM organizations
WHERE subdomain = 'primarygoal';

-- If the workspace_id is NULL, you need to:
-- 1. Go to Super Admin > Organizations > PrimaryGoal > Overview tab
-- 2. Click "Edit Organization"
-- 3. Enter the PowerBI Workspace ID and Name
-- 4. Click "Save Changes"

-- Example of how to manually set workspace if needed:
-- UPDATE organizations
-- SET
--   powerbi_workspace_id = 'YOUR_WORKSPACE_ID_HERE',
--   powerbi_workspace_name = 'Primary Goal Workspace Name'
-- WHERE subdomain = 'primarygoal';
