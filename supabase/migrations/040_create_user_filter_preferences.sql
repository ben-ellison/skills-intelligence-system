-- Create table for storing user filter preferences across PowerBI reports
CREATE TABLE IF NOT EXISTS user_filter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- e.g., 'operations', 'summary', 'module_specific'
  filter_state JSONB NOT NULL, -- Stores the actual filter configuration
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one filter preference per user per report type
  UNIQUE(user_id, organization_id, report_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_filter_preferences_user_org
  ON user_filter_preferences(user_id, organization_id);

-- Enable RLS
ALTER TABLE user_filter_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own filter preferences
CREATE POLICY "Users can view their own filter preferences"
  ON user_filter_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own filter preferences"
  ON user_filter_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own filter preferences"
  ON user_filter_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own filter preferences"
  ON user_filter_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_filter_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_user_filter_preferences_timestamp
  BEFORE UPDATE ON user_filter_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_filter_preferences_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_filter_preferences TO authenticated;
