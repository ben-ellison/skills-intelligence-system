-- Check what reports were deployed to PrimaryGoal organization
SELECT
  opr.id,
  opr.name,
  opr.powerbi_report_id,
  opr.powerbi_workspace_id,
  opr.deployment_status,
  opr.deployed_at,
  tr.name as template_name
FROM organization_powerbi_reports opr
LEFT JOIN powerbi_reports tr ON opr.template_report_id = tr.id
WHERE opr.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
ORDER BY opr.deployed_at DESC;

-- Also check what tabs are configured
SELECT
  tmt.tab_name,
  tmt.page_name,
  tmt.is_active,
  om.name as module_name
FROM tenant_module_tabs tmt
JOIN organization_modules om ON tmt.module_id = om.id
WHERE tmt.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
ORDER BY om.name, tmt.sort_order;
