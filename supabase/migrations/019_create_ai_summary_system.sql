-- ============================================
-- MIGRATION 019: AI Summary System
-- ============================================
-- Creates tables for AI-powered daily summaries:
-- 1. Configurable prompts per role (Super Admin managed)
-- 2. Historical summaries for trend tracking
-- 3. PowerBI user filter mappings for RLS
-- 4. User dashboard filter persistence

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. AI_SUMMARY_PROMPTS (Configurable by Super Admin)
-- ============================================
-- Stores the prompt templates for each role
-- Super admins can edit these without code changes

CREATE TABLE IF NOT EXISTS ai_summary_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Role Configuration
  role_name TEXT NOT NULL, -- 'Senior Leader', 'Skills Coach', 'Quality Lead', etc.
  display_name TEXT NOT NULL, -- Human-readable name for UI

  -- Prompt Configuration
  prompt_template TEXT NOT NULL, -- The actual prompt text with placeholders
  system_prompt TEXT, -- Optional system prompt for the AI

  -- Dashboard Configuration
  dashboard_report_id UUID REFERENCES powerbi_reports(id) ON DELETE SET NULL,
  immediate_priorities_report_id UUID REFERENCES powerbi_reports(id) ON DELETE SET NULL,

  -- Versioning
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- Email of super admin who created it
  updated_by TEXT, -- Email of super admin who last updated it

  -- Ensure one active prompt per role
  UNIQUE(role_name, version)
);

COMMENT ON TABLE ai_summary_prompts IS 'Configurable AI prompt templates for daily summaries - managed by Super Admins';
COMMENT ON COLUMN ai_summary_prompts.role_name IS 'User role this prompt is for (matches global_user_roles.role_name)';
COMMENT ON COLUMN ai_summary_prompts.prompt_template IS 'The prompt text with placeholders like {{total_learners}}, {{previous_summary}}, etc.';
COMMENT ON COLUMN ai_summary_prompts.version IS 'Version number for prompt iteration tracking';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_role ON ai_summary_prompts(role_name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_summary_prompts(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_summary_prompts_updated_at ON ai_summary_prompts;
CREATE TRIGGER update_ai_summary_prompts_updated_at
  BEFORE UPDATE ON ai_summary_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. AI_SUMMARIES (Historical Tracking)
-- ============================================
-- Stores generated summaries with historical data
-- Enables AI to compare current vs previous state

CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User & Organization
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role_name TEXT NOT NULL, -- Role at time of generation

  -- Summary Content
  summary_text TEXT NOT NULL, -- The AI-generated summary
  summary_html TEXT, -- Optional HTML-formatted version

  -- Data Snapshot
  dashboard_data JSONB, -- Snapshot of PowerBI data from Dashboard page
  priorities_data JSONB, -- Snapshot of PowerBI data from Immediate Priorities page

  -- Comparison & Learning
  previous_summary_id UUID REFERENCES ai_summaries(id) ON DELETE SET NULL,
  data_changed BOOLEAN DEFAULT true, -- Whether data changed since last summary
  key_changes JSONB, -- Array of key metric changes detected

  -- AI Configuration Used
  prompt_id UUID REFERENCES ai_summary_prompts(id) ON DELETE SET NULL,
  ai_model TEXT, -- e.g., 'gpt-4o'
  tokens_used INTEGER, -- For cost tracking

  -- Status
  generation_status TEXT DEFAULT 'completed', -- 'completed', 'failed', 'pending'
  generation_error TEXT, -- Error message if failed

  -- User Interaction
  viewed_at TIMESTAMPTZ, -- When user first viewed this summary
  dismissed_at TIMESTAMPTZ, -- When user dismissed it
  user_feedback TEXT, -- Optional: user can rate/comment on summary quality

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_summaries IS 'Historical AI-generated summaries for users - enables trend tracking and learning';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user ON ai_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_org ON ai_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_date ON ai_summaries(generated_at);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_date ON ai_summaries(user_id, generated_at DESC);

-- ============================================
-- 3. POWERBI_USER_FILTER_MAPPINGS
-- ============================================
-- Maps which PowerBI field to use for user filtering
-- Different reports may use different field names

CREATE TABLE IF NOT EXISTS powerbi_user_filter_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Report Configuration
  report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE NOT NULL,

  -- Filter Configuration
  filter_field_name TEXT NOT NULL, -- e.g., 'Skills Coach Email', 'user_email', 'CoachEmail'
  filter_type TEXT DEFAULT 'email', -- 'email', 'username', 'user_id'

  -- Role-Specific Filtering (Optional)
  role_name TEXT, -- If null, applies to all roles; if set, only for this role

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(report_id, role_name)
);

COMMENT ON TABLE powerbi_user_filter_mappings IS 'Maps PowerBI field names for user filtering - handles different field names across reports';
COMMENT ON COLUMN powerbi_user_filter_mappings.filter_field_name IS 'The actual field name in the PowerBI dataset (e.g., "Skills Coach Email")';
COMMENT ON COLUMN powerbi_user_filter_mappings.filter_type IS 'What user property to filter by: email, username, or user_id';
COMMENT ON COLUMN powerbi_user_filter_mappings.role_name IS 'If set, this mapping only applies to users with this role';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_powerbi_filter_mappings_report ON powerbi_user_filter_mappings(report_id);
CREATE INDEX IF NOT EXISTS idx_powerbi_filter_mappings_role ON powerbi_user_filter_mappings(role_name);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_powerbi_user_filter_mappings_updated_at ON powerbi_user_filter_mappings;
CREATE TRIGGER update_powerbi_user_filter_mappings_updated_at
  BEFORE UPDATE ON powerbi_user_filter_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. USER_DASHBOARD_FILTERS (Filter Persistence)
-- ============================================
-- Remembers user's filter state across sessions
-- Resets to defaults on logout

CREATE TABLE IF NOT EXISTS user_dashboard_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User & Report
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE NOT NULL,

  -- Filter State
  filters JSONB NOT NULL, -- Stores the filter state from PowerBI

  -- Session Management
  session_id TEXT, -- Current session ID
  is_active BOOLEAN DEFAULT true, -- False when user logs out

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, report_id)
);

COMMENT ON TABLE user_dashboard_filters IS 'Persists user filter selections across reports - resets on logout';
COMMENT ON COLUMN user_dashboard_filters.filters IS 'JSON representation of PowerBI filter state';
COMMENT ON COLUMN user_dashboard_filters.session_id IS 'Current session - used to invalidate filters on logout';
COMMENT ON COLUMN user_dashboard_filters.is_active IS 'Set to false on logout to reset filters';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_filters_user ON user_dashboard_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_filters_report ON user_dashboard_filters(report_id);
CREATE INDEX IF NOT EXISTS idx_user_filters_active ON user_dashboard_filters(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_dashboard_filters_updated_at ON user_dashboard_filters;
CREATE TRIGGER update_user_dashboard_filters_updated_at
  BEFORE UPDATE ON user_dashboard_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 019 completed successfully!';
  RAISE NOTICE '✓ Created ai_summary_prompts table (Super Admin configurable)';
  RAISE NOTICE '✓ Created ai_summaries table (historical tracking)';
  RAISE NOTICE '✓ Created powerbi_user_filter_mappings table';
  RAISE NOTICE '✓ Created user_dashboard_filters table';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure AI summary prompts in Super Admin UI';
  RAISE NOTICE '2. Set up PowerBI user filter field mappings';
  RAISE NOTICE '3. Configure PowerBI refresh webhook';
  RAISE NOTICE '4. Set up UK-based Azure OpenAI credentials';
END $$;
