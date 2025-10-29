-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  powerbi_master_workspace_id TEXT,
  powerbi_master_workspace_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read/write system settings
-- This will be enforced at the application level since we can't check isSuperAdmin in RLS
CREATE POLICY "Allow service role full access to system_settings"
  ON system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default row (will be updated via UI)
INSERT INTO system_settings (powerbi_master_workspace_id, powerbi_master_workspace_name)
VALUES (null, null)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE system_settings IS 'Global system configuration settings';
COMMENT ON COLUMN system_settings.powerbi_master_workspace_id IS 'PowerBI workspace ID where master/template reports are stored';
COMMENT ON COLUMN system_settings.powerbi_master_workspace_name IS 'Friendly name for the master workspace';
