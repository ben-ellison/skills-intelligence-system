-- ============================================
-- POWERBI MULTI-WORKSPACE ARCHITECTURE
-- ============================================
-- Supports one workspace per organization for complete data isolation
-- Report templates are defined globally, deployed per organization

-- ============================================
-- 1. UPDATE POWERBI_REPORTS TO SUPPORT TEMPLATES
-- ============================================

-- Add template flag to existing reports
ALTER TABLE powerbi_reports
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT true;

COMMENT ON COLUMN powerbi_reports.is_template IS 'True if this is a global template to be deployed to organizations';

-- Update existing powerbi_reports structure to be template-focused
COMMENT ON TABLE powerbi_reports IS 'Global PowerBI report templates - define what reports exist and their properties';
COMMENT ON COLUMN powerbi_reports.powerbi_report_id IS 'Template/reference Report ID (from your master workspace)';
COMMENT ON COLUMN powerbi_reports.powerbi_workspace_id IS 'Template/reference Workspace ID (your master workspace)';

-- ============================================
-- 2. ORGANIZATION POWERBI REPORTS (DEPLOYED INSTANCES)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_powerbi_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  template_report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE NOT NULL,

  -- Organization's actual PowerBI IDs (in their workspace)
  powerbi_report_id TEXT NOT NULL, -- Their actual Report GUID
  powerbi_workspace_id TEXT NOT NULL, -- Their workspace GUID
  powerbi_dataset_id TEXT, -- Their dataset GUID

  -- Deployment tracking
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_by UUID REFERENCES users(id),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  deployment_status TEXT DEFAULT 'active', -- active | failed | pending | archived
  deployment_notes TEXT,

  -- Configuration overrides (org-specific settings)
  custom_display_name TEXT, -- Override the template's display name
  custom_filters JSONB DEFAULT '{}', -- Org-specific PowerBI filters
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one report template can only be deployed once per org
  UNIQUE(organization_id, template_report_id)
);

COMMENT ON TABLE organization_powerbi_reports IS 'Actual deployed PowerBI reports per organization (their specific Report IDs)';
COMMENT ON COLUMN organization_powerbi_reports.template_report_id IS 'References the global template this was deployed from';
COMMENT ON COLUMN organization_powerbi_reports.powerbi_report_id IS 'Actual Report GUID in this organization workspace';
COMMENT ON COLUMN organization_powerbi_reports.powerbi_workspace_id IS 'Actual Workspace GUID for this organization';
COMMENT ON COLUMN organization_powerbi_reports.deployment_status IS 'Tracks if report was successfully deployed';
COMMENT ON COLUMN organization_powerbi_reports.custom_filters IS 'Organization-specific PowerBI filter overrides';

CREATE INDEX idx_org_reports_organization ON organization_powerbi_reports(organization_id);
CREATE INDEX idx_org_reports_template ON organization_powerbi_reports(template_report_id);
CREATE INDEX idx_org_reports_status ON organization_powerbi_reports(deployment_status);

-- ============================================
-- 3. ORGANIZATION POWERBI WORKSPACE INFO
-- ============================================

-- Add PowerBI workspace tracking to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS powerbi_workspace_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS powerbi_workspace_name TEXT,
ADD COLUMN IF NOT EXISTS powerbi_workspace_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS powerbi_capacity_id TEXT; -- Premium/Embedded capacity if applicable

COMMENT ON COLUMN organizations.powerbi_workspace_id IS 'This organization PowerBI workspace GUID';
COMMENT ON COLUMN organizations.powerbi_workspace_name IS 'Friendly workspace name (e.g., "Acme Training Workspace")';
COMMENT ON COLUMN organizations.powerbi_capacity_id IS 'PowerBI Embedded/Premium capacity assignment';

CREATE INDEX IF NOT EXISTS idx_organizations_powerbi_workspace ON organizations(powerbi_workspace_id);

-- ============================================
-- 4. POWERBI DEPLOYMENT HISTORY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS powerbi_deployment_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  template_report_id UUID REFERENCES powerbi_reports(id) ON DELETE SET NULL,
  organization_report_id UUID REFERENCES organization_powerbi_reports(id) ON DELETE SET NULL,

  -- Deployment details
  action TEXT NOT NULL, -- 'deploy' | 'update' | 'delete' | 'refresh'
  status TEXT NOT NULL, -- 'success' | 'failed' | 'pending'

  -- Results
  powerbi_report_id TEXT, -- The Report ID that was deployed/updated
  powerbi_workspace_id TEXT,
  error_message TEXT,
  error_details JSONB,

  -- Performance
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  triggered_by_user_id UUID REFERENCES users(id),
  triggered_by TEXT, -- 'manual' | 'api' | 'automation'
  deployment_method TEXT, -- 'manual_upload' | 'powerbi_api' | 'azure_devops'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE powerbi_deployment_log IS 'Audit log of all PowerBI report deployments to organization workspaces';

CREATE INDEX idx_deployment_log_org ON powerbi_deployment_log(organization_id, created_at DESC);
CREATE INDEX idx_deployment_log_status ON powerbi_deployment_log(status, created_at DESC);
CREATE INDEX idx_deployment_log_template ON powerbi_deployment_log(template_report_id);

-- ============================================
-- 5. TRIGGERS
-- ============================================

CREATE TRIGGER update_organization_powerbi_reports_updated_at BEFORE UPDATE ON organization_powerbi_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organization_powerbi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE powerbi_deployment_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. HELPER VIEWS
-- ============================================

-- View to see all deployed reports per organization
CREATE OR REPLACE VIEW v_organization_reports AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  o.subdomain,
  o.powerbi_workspace_id as org_workspace_id,
  pr.id as template_id,
  pr.name as report_name,
  pr.category as report_category,
  opr.id as deployed_report_id,
  opr.powerbi_report_id as deployed_report_guid,
  opr.deployment_status,
  opr.deployed_at,
  opr.is_active
FROM organizations o
CROSS JOIN powerbi_reports pr
LEFT JOIN organization_powerbi_reports opr
  ON opr.organization_id = o.id
  AND opr.template_report_id = pr.id
WHERE pr.is_template = true
ORDER BY o.name, pr.category, pr.name;

COMMENT ON VIEW v_organization_reports IS 'Shows all template reports and their deployment status per organization';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN powerbi_reports.is_template IS 'Template reports are deployed to organization workspaces';
