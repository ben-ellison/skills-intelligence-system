-- Check current report IDs for PrimaryGoal
SELECT
  opr.id,
  opr.name,
  opr.powerbi_report_id as current_report_id,
  tr.name as template_name
FROM organization_powerbi_reports opr
LEFT JOIN powerbi_reports tr ON opr.template_report_id = tr.id
WHERE opr.organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
AND opr.name ILIKE '%senior leader%'
ORDER BY opr.name;

-- Update the Senior Leader Immediate Priorities report to use the correct ID
-- UPDATE organization_powerbi_reports
-- SET powerbi_report_id = 'fc9f80db-3865-47fa-8e42-8c5f5cb67fc9'
-- WHERE organization_id = '06b13286-6b72-4f07-baad-eb0a6a24cf16'
-- AND name ILIKE '%senior leader%immediate%';
