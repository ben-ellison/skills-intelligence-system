-- Add powerbi_page_name column to reports table to support specific page selection
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS powerbi_page_name VARCHAR(255);

COMMENT ON COLUMN reports.powerbi_page_name IS 'Optional: Specific PowerBI page name to display for this tab';
