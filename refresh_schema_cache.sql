-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Also verify the table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organization_powerbi_reports'
ORDER BY ordinal_position;
