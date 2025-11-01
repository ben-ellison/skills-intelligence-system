-- Check if "Senior Leader - Immediate Priorities" exists in template library
SELECT
  id,
  name,
  powerbi_report_id as template_powerbi_id
FROM powerbi_reports
WHERE name ILIKE '%senior leader%immediate%'
ORDER BY name;

-- Check what's actually deployed for PrimaryGoal
SELECT
  opr.id as deployed_id,
  opr.name as deployed_name,
  opr.powerbi_report_id as deployed_powerbi_id,
  opr.template_report_id,
  tr.name as template_name,
  tr.powerbi_report_id as template_powerbi_id
FROM organization_powerbi_reports opr
LEFT JOIN powerbi_reports tr ON opr.template_report_id = tr.id
WHERE opr.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
AND opr.name ILIKE '%senior leader%immediate%';
