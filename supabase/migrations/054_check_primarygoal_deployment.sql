-- Check what reports are deployed to PrimaryGoal
SELECT
  opr.name as report_name,
  opr.powerbi_report_id,
  opr.deployment_status,
  opr.deployed_at
FROM organization_powerbi_reports opr
WHERE opr.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
ORDER BY opr.deployed_at DESC;

-- Check if any Immediate Priorities reports were deployed
SELECT
  opr.name,
  tr.name as template_name
FROM organization_powerbi_reports opr
LEFT JOIN powerbi_reports tr ON opr.template_report_id = tr.id
WHERE opr.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
AND opr.name ILIKE '%immediate%';
