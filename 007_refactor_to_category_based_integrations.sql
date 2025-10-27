-- ============================================
-- REFACTOR TO CATEGORY-BASED INTEGRATIONS
-- ============================================
-- Changes integration system from presets to independent category selection
-- Categories: LMS, English & Maths, CRM, HR, Other

-- ============================================
-- 1. ADD PROVIDER CATEGORIES
-- ============================================

-- Add more specific provider types
INSERT INTO integration_providers (name, display_name, provider_type, description, config_schema, default_config, sort_order) VALUES
-- English & Maths Providers
('bksb', 'BKSB', 'english_maths', 'BKSB English and Maths Assessment',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "center_id": {"type": "string"}}}',
  '{}',
  20),
('functional_skills', 'Functional Skills', 'english_maths', 'Functional Skills Assessment Platform',
  '{"type": "object", "properties": {"api_key": {"type": "string"}}}',
  '{}',
  21),
('smart_assessor', 'Smart Assessor', 'english_maths', 'Smart Assessor English & Maths',
  '{"type": "object", "properties": {"api_key": {"type": "string"}}}',
  '{}',
  22),

-- Additional CRM Providers
('microsoft_dynamics', 'Microsoft Dynamics', 'crm', 'Microsoft Dynamics 365 CRM',
  '{"type": "object", "properties": {"tenant_id": {"type": "string"}, "client_id": {"type": "string"}, "client_secret": {"type": "string"}}}',
  '{}',
  12),
('zoho', 'Zoho CRM', 'crm', 'Zoho CRM Integration',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "domain": {"type": "string"}}}',
  '{}',
  13),

-- HR/Payroll Providers
('sage_hr', 'Sage HR', 'hr', 'Sage HR Management System',
  '{"type": "object", "properties": {"api_key": {"type": "string"}}}',
  '{}',
  30),
('bamboo_hr', 'BambooHR', 'hr', 'BambooHR Human Resources',
  '{"type": "object", "properties": {"api_key": {"type": "string"}, "subdomain": {"type": "string"}}}',
  '{}',
  31);

-- ============================================
-- 2. UPDATE ORGANIZATIONS TABLE
-- ============================================

-- Remove preset-based approach, use direct provider selection
ALTER TABLE organizations
DROP COLUMN IF EXISTS integration_preset_id,
DROP COLUMN IF EXISTS integration_config;

-- Add direct provider selections by category
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS lms_provider_id UUID REFERENCES integration_providers(id),
ADD COLUMN IF NOT EXISTS english_maths_provider_id UUID REFERENCES integration_providers(id),
ADD COLUMN IF NOT EXISTS crm_provider_id UUID REFERENCES integration_providers(id),
ADD COLUMN IF NOT EXISTS hr_provider_id UUID REFERENCES integration_providers(id),
ADD COLUMN IF NOT EXISTS other_integrations JSONB DEFAULT '[]'; -- Array of additional provider IDs

COMMENT ON COLUMN organizations.lms_provider_id IS 'Primary LMS provider (Aptem, Bud, OneFile, etc.)';
COMMENT ON COLUMN organizations.english_maths_provider_id IS 'English & Maths assessment provider (BKSB, etc.)';
COMMENT ON COLUMN organizations.crm_provider_id IS 'CRM provider (HubSpot, Salesforce, etc.)';
COMMENT ON COLUMN organizations.hr_provider_id IS 'HR/Payroll provider (Sage HR, etc.)';
COMMENT ON COLUMN organizations.other_integrations IS 'Additional integration provider IDs as array';

CREATE INDEX IF NOT EXISTS idx_organizations_lms_provider ON organizations(lms_provider_id);
CREATE INDEX IF NOT EXISTS idx_organizations_english_maths_provider ON organizations(english_maths_provider_id);
CREATE INDEX IF NOT EXISTS idx_organizations_crm_provider ON organizations(crm_provider_id);
CREATE INDEX IF NOT EXISTS idx_organizations_hr_provider ON organizations(hr_provider_id);

-- ============================================
-- 3. DEPRECATE PRESET TABLES (Keep for migration)
-- ============================================

-- Mark integration_presets as deprecated but keep data for reference
COMMENT ON TABLE integration_presets IS 'DEPRECATED - Now using category-based provider selection. Kept for historical data.';

-- We'll keep the tables but they won't be actively used
ALTER TABLE integration_presets ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE integration_preset_defaults ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 4. PROVIDER CATEGORY DEFAULTS
-- ============================================

-- Create a simpler defaults table for each provider
CREATE TABLE IF NOT EXISTS integration_provider_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_provider_id UUID REFERENCES integration_providers(id) ON DELETE CASCADE UNIQUE,

  -- Default configuration
  default_sync_frequency TEXT DEFAULT 'hourly',
  default_sync_config JSONB DEFAULT '{}',
  default_field_mappings JSONB DEFAULT '{}',
  default_filters JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE integration_provider_defaults IS 'Platform-wide default settings for each provider';

-- Insert defaults for existing providers
INSERT INTO integration_provider_defaults (integration_provider_id, default_sync_frequency)
SELECT id, 'hourly' FROM integration_providers
ON CONFLICT (integration_provider_id) DO NOTHING;

CREATE TRIGGER update_integration_provider_defaults_updated_at BEFORE UPDATE ON integration_provider_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ENABLE RLS ON NEW TABLE
-- ============================================

ALTER TABLE integration_provider_defaults ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN integration_providers.provider_type IS 'Provider category: lms, english_maths, crm, hr, other';
