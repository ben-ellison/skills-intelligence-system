-- Migration: Create AI prompts system
-- Created: 2025-01-30
-- Description: Store role-based AI prompts for daily summaries and system settings

-- Create ai_prompts table for role-based prompts
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE,
  prompt_name VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type VARCHAR(50) DEFAULT 'daily_summary',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_prompts_role_id ON ai_prompts(role_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON ai_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);

-- Add AI settings to system_settings table
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS azure_openai_endpoint VARCHAR(500),
ADD COLUMN IF NOT EXISTS azure_openai_deployment_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS azure_openai_api_version VARCHAR(50) DEFAULT '2024-02-15-preview',
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Create ai_summaries table to store generated summaries
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role_id UUID REFERENCES global_roles(id) ON DELETE SET NULL,
  summary_text TEXT NOT NULL,
  summary_date DATE NOT NULL,
  data_snapshot JSONB, -- Store the priorities data that was analyzed
  prompt_used TEXT, -- Store the prompt that was used
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for summaries
CREATE INDEX IF NOT EXISTS idx_ai_summaries_org_date ON ai_summaries(organization_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_date ON ai_summaries(user_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_role ON ai_summaries(role_id);

-- Add comments for documentation
COMMENT ON TABLE ai_prompts IS 'Stores AI prompts for different roles and use cases';
COMMENT ON TABLE ai_summaries IS 'Stores generated AI summaries with their context';
COMMENT ON COLUMN ai_prompts.prompt_type IS 'Type of prompt: daily_summary, insight, alert, etc.';
COMMENT ON COLUMN ai_summaries.data_snapshot IS 'JSON snapshot of the data that was analyzed';

-- Insert default prompts for each role
INSERT INTO ai_prompts (role_id, prompt_name, prompt_text, prompt_type)
SELECT
  id,
  'Daily Summary for ' || display_name,
  'You are an AI assistant helping a ' || display_name || ' in an apprenticeship training organization.

Analyze the following immediate priorities data and provide a concise daily summary (2-3 paragraphs) focusing on:
1. Key urgent items requiring immediate attention
2. Trends or patterns in the data
3. Actionable recommendations specific to the ' || display_name || ' role

Be professional, clear, and action-oriented. Use bullet points where appropriate.

Data to analyze:
{priorities_data}',
  'daily_summary'
FROM global_roles
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ai_prompts TO authenticated;
GRANT SELECT ON ai_summaries TO authenticated;
GRANT INSERT ON ai_summaries TO service_role;
