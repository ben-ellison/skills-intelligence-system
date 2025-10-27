-- ============================================
-- INTEGRATION PRESETS SYSTEM
-- ============================================
-- Manages LMS/CRM integrations and provider-specific configurations
-- Examples: Aptem, Bud, OneFile, Aptem+HubSpot, Bud+Salesforce

-- ============================================
-- 1. INTEGRATION PROVIDERS
-- ============================================
-- Individual integration providers (Aptem, Bud, OneFile, HubSpot, Salesforce, etc.)
CREATE TABLE integration_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'aptem', 'bud', 'onefile', 'hubspot', 'salesforce'
  display_name TEXT NOT NULL, -- 'Aptem', 'Bud', 'OneFile', 'HubSpot', 'Salesforce'
  provider_type TEXT NOT NULL, -- 'lms' | 'crm' | 'hr' | 'other'
  description TEXT,
  logo_url TEXT,

  -- API Configuration Schema (what fields are needed)
  config_schema JSONB DEFAULT '{}', -- JSON Schema for API keys, endpoints, etc.

  -- Default configuration values
  default_config JSONB DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE integration_providers IS 'Individual integration providers (LMS, CRM, etc.)';
COMMENT ON COLUMN integration_providers.config_schema IS 'JSON Schema defining required configuration fields';
COMMENT ON COLUMN integration_providers.default_config IS 'Default configuration values for this provider';

-- ============================================
-- 2. INTEGRATION PRESETS
-- ============================================
-- Combinations of providers (e.g., "Aptem + HubSpot")
CREATE TABLE integration_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'aptem_hubspot', 'bud_salesforce', 'onefile_only'
  display_name TEXT NOT NULL, -- 'Aptem + HubSpot', 'Bud + Salesforce'
  description TEXT,

  -- Which providers are included (array of provider IDs)
  provider_ids UUID[] NOT NULL,

  -- Primary LMS provider (required)
  primary_lms_provider_id UUID REFERENCES integration_providers(id) NOT NULL,

  -- Default role-to-report mappings for this preset
  default_role_reports JSONB DEFAULT '{}',

  -- Default filters for PowerBI reports
  default_filters JSONB DEFAULT '{}',

  -- Feature flags specific to this preset
  feature_flags JSONB DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_recommended BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE integration_presets IS 'Combinations of integration providers (e.g., Aptem + HubSpot)';
COMMENT ON COLUMN integration_presets.provider_ids IS 'Array of integration_provider IDs included in this preset';
COMMENT ON COLUMN integration_presets.default_role_reports IS 'Default role-to-report mappings for this integration combo';
COMMENT ON COLUMN integration_presets.default_filters IS 'Default PowerBI filters for this integration';

CREATE INDEX idx_integration_presets_primary_lms ON integration_presets(primary_lms_provider_id);

-- ============================================
-- 3. INTEGRATION PRESET DEFAULTS
-- ============================================
-- Platform-wide default configurations for each preset
CREATE TABLE integration_preset_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_preset_id UUID REFERENCES integration_presets(id) ON DELETE CASCADE,
  integration_provider_id UUID REFERENCES integration_providers(id) ON DELETE CASCADE,

  -- Configuration for this specific provider within the preset
  config JSONB DEFAULT '{}',

  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily', 'manual'
  sync_config JSONB DEFAULT '{}',

  -- Data mapping configuration
  field_mappings JSONB DEFAULT '{}', -- Maps provider fields to our data model

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(integration_preset_id, integration_provider_id)
);

COMMENT ON TABLE integration_preset_defaults IS 'Platform-wide default configs for each provider within a preset';
COMMENT ON COLUMN integration_preset_defaults.field_mappings IS 'Maps provider API fields to our database schema';

CREATE INDEX idx_preset_defaults_preset ON integration_preset_defaults(integration_preset_id);
CREATE INDEX idx_preset_defaults_provider ON integration_preset_defaults(integration_provider_id);

-- ============================================
-- 4. ORGANIZATION INTEGRATIONS
-- ============================================
-- Update organizations table to reference integration preset
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS integration_preset_id UUID REFERENCES integration_presets(id),
ADD COLUMN IF NOT EXISTS integration_config JSONB DEFAULT '{}'; -- Org-specific overrides

COMMENT ON COLUMN organizations.integration_preset_id IS 'Which integration preset this org uses';
COMMENT ON COLUMN organizations.integration_config IS 'Organization-specific configuration overrides';

CREATE INDEX idx_organizations_integration_preset ON organizations(integration_preset_id);

-- ============================================
-- 5. ORGANIZATION INTEGRATION OVERRIDES
-- ============================================
-- Per-organization overrides for specific providers
CREATE TABLE organization_integration_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  integration_provider_id UUID REFERENCES integration_providers(id) ON DELETE CASCADE,

  -- Override configuration (merges with preset defaults)
  config JSONB DEFAULT '{}',

  -- Override sync settings
  sync_enabled BOOLEAN,
  sync_frequency TEXT,
  sync_config JSONB DEFAULT '{}',

  -- Override field mappings
  field_mappings JSONB DEFAULT '{}',

  -- Credentials (encrypted in production)
  api_credentials JSONB DEFAULT '{}', -- API keys, tokens, etc.

  -- Connection status
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- 'success' | 'failed' | 'partial'
  last_sync_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, integration_provider_id)
);

COMMENT ON TABLE organization_integration_overrides IS 'Org-specific integration configuration overrides';
COMMENT ON COLUMN organization_integration_overrides.api_credentials IS 'Provider-specific API credentials (should be encrypted)';

CREATE INDEX idx_org_integration_overrides_org ON organization_integration_overrides(organization_id);
CREATE INDEX idx_org_integration_overrides_provider ON organization_integration_overrides(integration_provider_id);

-- ============================================
-- 6. INTEGRATION SYNC LOGS
-- ============================================
-- Track all data synchronization attempts
CREATE TABLE integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  integration_provider_id UUID REFERENCES integration_providers(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL, -- 'full' | 'incremental' | 'manual'
  sync_direction TEXT NOT NULL, -- 'import' | 'export' | 'bidirectional'

  -- Results
  status TEXT NOT NULL, -- 'pending' | 'running' | 'success' | 'failed' | 'partial'
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Performance
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  triggered_by TEXT, -- 'schedule' | 'manual' | 'webhook'
  triggered_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE integration_sync_logs IS 'Audit trail of all integration sync operations';

CREATE INDEX idx_sync_logs_org ON integration_sync_logs(organization_id, created_at DESC);
CREATE INDEX idx_sync_logs_provider ON integration_sync_logs(integration_provider_id, created_at DESC);
CREATE INDEX idx_sync_logs_status ON integration_sync_logs(status, created_at DESC);

-- ============================================
-- 7. SEED DATA - INTEGRATION PROVIDERS
-- ============================================

-- LMS Providers
INSERT INTO integration_providers (name, display_name, provider_type, description, config_schema, default_config, sort_order) VALUES
('aptem', 'Aptem', 'lms', 'Aptem Apprenticeship Management System',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "api_url": {"type": "string"}}}',
  '{"api_url": "https://api.aptem.co.uk"}',
  1),
('bud', 'Bud', 'lms', 'Bud Apprenticeship Platform',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "tenant_id": {"type": "string"}}}',
  '{}',
  2),
('onefile', 'OneFile', 'lms', 'OneFile e-Portfolio System',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "organization_id": {"type": "string"}}}',
  '{}',
  3);

-- CRM Providers
INSERT INTO integration_providers (name, display_name, provider_type, description, config_schema, default_config, sort_order) VALUES
('hubspot', 'HubSpot', 'crm', 'HubSpot CRM Integration',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "portal_id": {"type": "string"}}}',
  '{}',
  10),
('salesforce', 'Salesforce', 'crm', 'Salesforce CRM Integration',
  '{"type": "object", "properties": {"client_id": {"type": "string"}, "client_secret": {"type": "string"}, "instance_url": {"type": "string"}}}',
  '{}',
  11);

-- ============================================
-- 8. SEED DATA - INTEGRATION PRESETS
-- ============================================

-- Get provider IDs for preset creation
DO $$
DECLARE
  aptem_id UUID;
  bud_id UUID;
  onefile_id UUID;
  hubspot_id UUID;
  salesforce_id UUID;
BEGIN
  SELECT id INTO aptem_id FROM integration_providers WHERE name = 'aptem';
  SELECT id INTO bud_id FROM integration_providers WHERE name = 'bud';
  SELECT id INTO onefile_id FROM integration_providers WHERE name = 'onefile';
  SELECT id INTO hubspot_id FROM integration_providers WHERE name = 'hubspot';
  SELECT id INTO salesforce_id FROM integration_providers WHERE name = 'salesforce';

  -- Aptem only
  INSERT INTO integration_presets (name, display_name, description, provider_ids, primary_lms_provider_id, is_recommended, sort_order)
  VALUES ('aptem_only', 'Aptem', 'Aptem LMS only', ARRAY[aptem_id], aptem_id, true, 1);

  -- Bud only
  INSERT INTO integration_presets (name, display_name, description, provider_ids, primary_lms_provider_id, sort_order)
  VALUES ('bud_only', 'Bud', 'Bud LMS only', ARRAY[bud_id], bud_id, 2);

  -- OneFile only
  INSERT INTO integration_presets (name, display_name, description, provider_ids, primary_lms_provider_id, sort_order)
  VALUES ('onefile_only', 'OneFile', 'OneFile LMS only', ARRAY[onefile_id], onefile_id, 3);

  -- Aptem + HubSpot
  INSERT INTO integration_presets (name, display_name, description, provider_ids, primary_lms_provider_id, is_recommended, sort_order)
  VALUES ('aptem_hubspot', 'Aptem + HubSpot', 'Aptem LMS with HubSpot CRM integration', ARRAY[aptem_id, hubspot_id], aptem_id, true, 4);

  -- Bud + Salesforce
  INSERT INTO integration_presets (name, display_name, description, provider_ids, primary_lms_provider_id, sort_order)
  VALUES ('bud_salesforce', 'Bud + Salesforce', 'Bud LMS with Salesforce CRM integration', ARRAY[bud_id, salesforce_id], bud_id, 5);

  -- Aptem + Salesforce
  INSERT INTO integration_presets (name, display_name, description, provider_ids, primary_lms_provider_id, sort_order)
  VALUES ('aptem_salesforce', 'Aptem + Salesforce', 'Aptem LMS with Salesforce CRM integration', ARRAY[aptem_id, salesforce_id], aptem_id, 6);
END $$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_integration_providers_updated_at BEFORE UPDATE ON integration_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_presets_updated_at BEFORE UPDATE ON integration_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_preset_defaults_updated_at BEFORE UPDATE ON integration_preset_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_integration_overrides_updated_at BEFORE UPDATE ON organization_integration_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_preset_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_integration_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
