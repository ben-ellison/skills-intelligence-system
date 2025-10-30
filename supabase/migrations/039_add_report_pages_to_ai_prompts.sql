-- Migration: Add PowerBI report and page configuration to AI prompts
-- This allows each AI prompt to specify which report and pages to analyze

-- Add columns to store the PowerBI report and pages for data extraction
ALTER TABLE ai_prompts
ADD COLUMN IF NOT EXISTS powerbi_report_id UUID REFERENCES powerbi_reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS powerbi_page_names TEXT[] DEFAULT '{}';

-- Add a comment to explain the purpose
COMMENT ON COLUMN ai_prompts.powerbi_report_id IS 'The PowerBI report to extract data from for this AI prompt';
COMMENT ON COLUMN ai_prompts.powerbi_page_names IS 'Array of page names to extract data from. If empty, uses all pages.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_prompts_report ON ai_prompts(powerbi_report_id) WHERE powerbi_report_id IS NOT NULL;
