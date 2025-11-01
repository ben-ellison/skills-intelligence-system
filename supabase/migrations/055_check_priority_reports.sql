-- Check what "Immediate Priorities" reports are deployed to PrimaryGoal
SELECT
  opr.id,
  opr.name,
  opr.powerbi_report_id,
  opr.powerbi_workspace_id,
  opr.deployment_status,
  tr.name as template_name,
  tr.powerbi_report_id as template_powerbi_id
FROM organization_powerbi_reports opr
LEFT JOIN powerbi_reports tr ON opr.template_report_id = tr.id
WHERE opr.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
AND (
  opr.name ILIKE '%immediate%'
  OR opr.name ILIKE '%senior leader%'
  OR tr.name ILIKE '%immediate%'
  OR tr.name ILIKE '%senior leader%'
)
ORDER BY opr.deployed_at DESC;

-- Also show the workspace ID being used
SELECT DISTINCT powerbi_workspace_id
FROM organization_powerbi_reports
WHERE organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16';
