-- ============================================
-- SKILLS INTELLIGENCE SYSTEM - DATABASE SCHEMA
-- ============================================
-- Complete schema for multi-tenant PowerBI SaaS platform
-- with learner-bracket based pricing and AI capabilities

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. SUBSCRIPTION TIERS
-- ============================================
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'core' | 'clarity' | 'intelligence'
  display_name TEXT NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing brackets (stored separately for flexibility)
CREATE TABLE pricing_brackets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_tier_id UUID REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  min_learners INTEGER NOT NULL,
  max_learners INTEGER, -- NULL = unlimited
  monthly_price DECIMAL(10,2) NOT NULL,
  yearly_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_learner_range CHECK (min_learners >= 0),
  CONSTRAINT valid_max_learners CHECK (max_learners IS NULL OR max_learners >= min_learners)
);

CREATE INDEX idx_pricing_brackets_tier ON pricing_brackets(subscription_tier_id);

-- ============================================
-- 2. ORGANIZATIONS (Tenants)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,

  -- Subscription
  subscription_tier_id UUID REFERENCES subscription_tiers(id),
  subscription_status TEXT DEFAULT 'trial', -- trial | active | suspended | cancelled
  billing_cycle TEXT DEFAULT 'monthly', -- monthly | yearly

  -- Learner tracking (determines pricing bracket)
  current_learner_count INTEGER DEFAULT 0,
  max_learner_count_this_period INTEGER DEFAULT 0, -- Peak for billing
  learner_count_last_updated TIMESTAMPTZ,

  -- Subscription dates
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,

  -- Billing contact
  billing_email TEXT,
  billing_contact_name TEXT,

  -- Customization
  logo_url TEXT,
  theme_config JSONB DEFAULT '{}',

  -- Storage tracking
  data_storage_gb DECIMAL(10,2) DEFAULT 0,

  -- Feature overrides (super admin can enable features beyond tier)
  feature_overrides JSONB DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX idx_organizations_tier ON organizations(subscription_tier_id);
CREATE INDEX idx_organizations_status ON organizations(subscription_status);

-- ============================================
-- 3. LEARNER COUNT SNAPSHOTS (for billing)
-- ============================================
CREATE TABLE learner_count_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  learner_count INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, snapshot_date)
);

CREATE INDEX idx_learner_snapshots_org_date ON learner_count_snapshots(organization_id, snapshot_date DESC);

-- ============================================
-- 4. USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Role flags
  is_super_admin BOOLEAN DEFAULT false,
  is_tenant_admin BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'invited', -- invited | active | suspended
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,

  -- Authentication (Supabase Auth handles actual auth)
  auth_user_id UUID UNIQUE, -- References auth.users(id)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_user_id);

-- ============================================
-- 5. GLOBAL ROLES (Templates)
-- ============================================
CREATE TABLE global_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'senior_leader', 'operations_leader', etc.
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name/identifier
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. USER ROLE ASSIGNMENTS
-- ============================================
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  global_role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, global_role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(global_role_id);

-- ============================================
-- 7. POWERBI REPORTS LIBRARY
-- ============================================
CREATE TABLE powerbi_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- PowerBI identifiers
  powerbi_report_id TEXT NOT NULL, -- GUID from PowerBI
  powerbi_workspace_id TEXT NOT NULL,
  powerbi_dataset_id TEXT,

  -- Categorization
  category TEXT, -- 'senior_leader', 'operations', etc.
  version TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_powerbi_reports_category ON powerbi_reports(category);

-- ============================================
-- 8. GLOBAL ROLE REPORTS (Default assignments)
-- ============================================
CREATE TABLE global_role_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE,
  powerbi_report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE,

  -- Display configuration
  display_name TEXT NOT NULL, -- Tab name
  powerbi_page_name TEXT, -- Specific page to show
  navigation_order INTEGER DEFAULT 0,

  -- Features
  enable_insights BOOLEAN DEFAULT false,
  default_filters JSONB DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(global_role_id, powerbi_report_id)
);

CREATE INDEX idx_global_role_reports_role ON global_role_reports(global_role_id);
CREATE INDEX idx_global_role_reports_report ON global_role_reports(powerbi_report_id);

-- ============================================
-- 9. ORGANIZATION ROLE OVERRIDES (Super Admin only)
-- ============================================
CREATE TABLE organization_role_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  global_role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE,
  powerbi_report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE,

  -- Override type
  override_type TEXT NOT NULL, -- 'add' | 'remove' | 'replace'

  -- Custom display (if different from global)
  display_name TEXT,
  powerbi_page_name TEXT,
  navigation_order INTEGER,
  custom_filters JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, global_role_id, powerbi_report_id)
);

CREATE INDEX idx_org_overrides_org_role ON organization_role_overrides(organization_id, global_role_id);

-- ============================================
-- 10. USER ADDITIONAL REPORTS (Tenant Admin grants)
-- ============================================
CREATE TABLE user_additional_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  powerbi_report_id UUID REFERENCES powerbi_reports(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  UNIQUE(user_id, powerbi_report_id)
);

CREATE INDEX idx_user_additional_reports_user ON user_additional_reports(user_id);

-- ============================================
-- 11. AI SUMMARY CONFIGURATIONS
-- ============================================
CREATE TABLE ai_summary_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE,

  -- Which PowerBI pages to analyze
  immediate_priorities_page_name TEXT NOT NULL,
  role_specific_page_name TEXT NOT NULL,

  -- AI Prompt template
  prompt_template TEXT NOT NULL,

  -- Schedule
  run_frequency TEXT DEFAULT 'daily', -- daily | on_data_refresh | on_demand
  run_time TIME DEFAULT '06:00:00', -- When to run (UTC)

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(global_role_id)
);

-- ============================================
-- 12. AI SUMMARIES (Generated daily)
-- ============================================
CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  global_role_id UUID REFERENCES global_roles(id),

  -- PowerBI report context
  powerbi_report_id UUID REFERENCES powerbi_reports(id),
  immediate_priorities_page_data JSONB,
  role_dashboard_page_data JSONB,

  -- AI generation
  ai_prompt TEXT,
  ai_summary TEXT,
  ai_model TEXT,
  tokens_used INTEGER,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER,
  data_refresh_timestamp TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'completed', -- pending | completed | failed
  error_message TEXT
);

CREATE INDEX idx_ai_summaries_user_date ON ai_summaries(user_id, generated_at DESC);
CREATE INDEX idx_ai_summaries_org ON ai_summaries(organization_id);

-- ============================================
-- 13. AI SUMMARY QUEUE (for background processing)
-- ============================================
CREATE TABLE ai_summary_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  global_role_id UUID REFERENCES global_roles(id),

  status TEXT DEFAULT 'pending', -- pending | processing | completed | failed
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_queue_status ON ai_summary_queue(status, scheduled_for);

-- ============================================
-- 14. AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action TEXT NOT NULL, -- 'user_created', 'report_accessed', 'subscription_changed', etc.
  resource_type TEXT, -- 'user', 'organization', 'report', etc.
  resource_id UUID,

  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_subscription_tiers_updated_at BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_roles_updated_at BEFORE UPDATE ON global_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_powerbi_reports_updated_at BEFORE UPDATE ON powerbi_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_role_reports_updated_at BEFORE UPDATE ON global_role_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_summary_configs_updated_at BEFORE UPDATE ON ai_summary_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_count_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE powerbi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_role_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_role_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_additional_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summary_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summary_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be added in a separate migration
-- after authentication is set up. For now, service role will be used.

-- ============================================
-- COMMENTS (Documentation)
-- ============================================
COMMENT ON TABLE subscription_tiers IS 'Subscription tier definitions (Core, Clarity, Intelligence)';
COMMENT ON TABLE pricing_brackets IS 'Learner-count based pricing brackets for each tier';
COMMENT ON TABLE organizations IS 'Tenant organizations with subscription and customization';
COMMENT ON TABLE learner_count_snapshots IS 'Daily snapshots of learner counts for billing accuracy';
COMMENT ON TABLE users IS 'Platform users with role and organization assignments';
COMMENT ON TABLE global_roles IS 'Role templates (Senior Leader, Operations Leader, etc.)';
COMMENT ON TABLE user_roles IS 'User-to-role assignments';
COMMENT ON TABLE powerbi_reports IS 'PowerBI report library managed by super admin';
COMMENT ON TABLE global_role_reports IS 'Default report assignments for roles (applies to all orgs)';
COMMENT ON TABLE organization_role_overrides IS 'Org-specific report overrides (super admin only)';
COMMENT ON TABLE user_additional_reports IS 'Additional reports granted to specific users (tenant admin)';
COMMENT ON TABLE ai_summary_configs IS 'AI summary configuration per role';
COMMENT ON TABLE ai_summaries IS 'Generated AI summaries for users';
COMMENT ON TABLE ai_summary_queue IS 'Queue for background AI summary generation';
COMMENT ON TABLE audit_log IS 'Audit trail of all platform actions';
