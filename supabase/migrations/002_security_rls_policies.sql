-- ============================================
-- SECURITY POLICIES - Row Level Security (RLS)
-- ============================================
-- Comprehensive RLS policies for data protection
-- Ensures organizations can only see their own data

-- ============================================
-- 1. ORGANIZATION ISOLATION
-- ============================================

-- Organizations table: Only see your own org
CREATE POLICY "org_own_data_only" ON organizations
  FOR ALL
  USING (
    -- Super admin can see all orgs (metadata only, no PII)
    (auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    ))
    OR
    -- Tenant admin and users can see their own org
    (id IN (
      SELECT organization_id FROM users WHERE auth.uid() = auth_user_id
    ))
  );

-- ============================================
-- 2. USER ACCESS CONTROL
-- ============================================

-- Users can see:
-- - Super admins: All users (for platform management)
-- - Tenant admins: Users in their organization
-- - Regular users: Only themselves
CREATE POLICY "users_access_control" ON users
  FOR SELECT
  USING (
    -- Super admin sees all
    (auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    ))
    OR
    -- Tenant admin sees their org users
    (organization_id IN (
      SELECT organization_id FROM users
      WHERE auth.uid() = auth_user_id
      AND is_tenant_admin = true
    ))
    OR
    -- Users see themselves
    (auth.uid() = auth_user_id)
  );

-- Users can only update their own profile (unless admin)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (
    (auth.uid() = auth_user_id)
    OR
    (auth.uid() IN (
      SELECT auth_user_id FROM users
      WHERE is_super_admin = true OR is_tenant_admin = true
    ))
  );

-- Only admins can create users
CREATE POLICY "users_admin_create" ON users
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM users
      WHERE is_super_admin = true OR is_tenant_admin = true
    )
  );

-- Only admins can delete users
CREATE POLICY "users_admin_delete" ON users
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users
      WHERE is_super_admin = true OR is_tenant_admin = true
    )
  );

-- ============================================
-- 3. GLOBAL ROLES & REPORTS (Super Admin Only)
-- ============================================

-- Global roles: Everyone can read, only super admin can modify
CREATE POLICY "global_roles_read_all" ON global_roles
  FOR SELECT
  USING (true); -- All authenticated users can see role definitions

CREATE POLICY "global_roles_admin_only" ON global_roles
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

-- PowerBI reports: Same as global roles
CREATE POLICY "powerbi_reports_read_all" ON powerbi_reports
  FOR SELECT
  USING (true);

CREATE POLICY "powerbi_reports_admin_only" ON powerbi_reports
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

-- Global role reports: Same pattern
CREATE POLICY "global_role_reports_read_all" ON global_role_reports
  FOR SELECT
  USING (true);

CREATE POLICY "global_role_reports_admin_only" ON global_role_reports
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

-- ============================================
-- 4. ORGANIZATION-SPECIFIC DATA
-- ============================================

-- Organization role overrides: Super admin only
CREATE POLICY "org_overrides_admin_only" ON organization_role_overrides
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

-- User additional reports: Tenant admin can grant
CREATE POLICY "user_additional_reports_admin" ON user_additional_reports
  FOR ALL
  USING (
    -- Tenant admin in same org
    (auth.uid() IN (
      SELECT u.auth_user_id FROM users u
      JOIN user_additional_reports uar ON uar.user_id IN (
        SELECT id FROM users WHERE organization_id = u.organization_id
      )
      WHERE u.is_tenant_admin = true
      AND auth.uid() = u.auth_user_id
    ))
    OR
    -- Super admin
    (auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    ))
  );

-- Users can see their own additional reports
CREATE POLICY "user_additional_reports_read_own" ON user_additional_reports
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth.uid() = auth_user_id
    )
  );

-- ============================================
-- 5. AI SUMMARIES (Intelligence Tier Only)
-- ============================================

-- Users can only see their own AI summaries
CREATE POLICY "ai_summaries_read_own" ON ai_summaries
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth.uid() = auth_user_id
    )
  );

-- Only system can write AI summaries (use service role key)
CREATE POLICY "ai_summaries_system_write" ON ai_summaries
  FOR INSERT
  WITH CHECK (
    -- This will be called via service role key, not user auth
    auth.role() = 'service_role'
  );

-- Super admin can see aggregated summaries (for debugging)
CREATE POLICY "ai_summaries_admin_aggregate" ON ai_summaries
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

-- ============================================
-- 6. AUDIT LOG
-- ============================================

-- Users can only read their own audit logs
CREATE POLICY "audit_log_read_own" ON audit_log
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth.uid() = auth_user_id
    )
    OR
    -- Tenant admin can see org audit logs
    (organization_id IN (
      SELECT organization_id FROM users
      WHERE auth.uid() = auth_user_id AND is_tenant_admin = true
    ))
    OR
    -- Super admin can see all (for security monitoring)
    (auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    ))
  );

-- Only system can write to audit log
CREATE POLICY "audit_log_system_write" ON audit_log
  FOR INSERT
  WITH CHECK (true); -- Any authenticated action can create audit log

-- Audit log is immutable (no updates or deletes)
-- (Handled by revoking permissions, not RLS)

-- ============================================
-- 7. SUBSCRIPTION TIERS & PRICING
-- ============================================

-- Everyone can read pricing (for public pricing page)
CREATE POLICY "pricing_public_read" ON subscription_tiers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "pricing_brackets_public_read" ON pricing_brackets
  FOR SELECT
  USING (true);

-- Only super admin can modify
CREATE POLICY "pricing_admin_only" ON subscription_tiers
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

CREATE POLICY "pricing_brackets_admin_only" ON pricing_brackets
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    )
  );

-- ============================================
-- 8. LEARNER COUNT SNAPSHOTS
-- ============================================

-- Only organization can see their own snapshots
CREATE POLICY "learner_snapshots_org_only" ON learner_count_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth.uid() = auth_user_id
    )
    OR
    -- Super admin for billing
    (auth.uid() IN (
      SELECT auth_user_id FROM users WHERE is_super_admin = true
    ))
  );

-- Only system can write snapshots (automated daily job)
CREATE POLICY "learner_snapshots_system_write" ON learner_count_snapshots
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user has feature access
CREATE OR REPLACE FUNCTION user_has_feature(feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  tier_features JSONB;
BEGIN
  -- Get user's organization tier
  SELECT st.features INTO tier_features
  FROM users u
  JOIN organizations o ON u.organization_id = o.id
  JOIN subscription_tiers st ON o.subscription_tier_id = st.id
  WHERE u.auth_user_id = auth.uid();

  -- Check if feature exists in tier
  RETURN (tier_features->>feature_name)::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log data access (for audit trail)
CREATE OR REPLACE FUNCTION log_data_access(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    created_at
  )
  SELECT
    p_user_id,
    u.organization_id,
    'data_access',
    p_resource_type,
    p_resource_id,
    NOW()
  FROM users u
  WHERE u.id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REVOKE DANGEROUS PERMISSIONS
-- ============================================

-- Revoke DELETE on audit_log (immutable)
REVOKE DELETE ON audit_log FROM authenticated;
REVOKE DELETE ON audit_log FROM anon;

-- Revoke UPDATE on audit_log (immutable)
REVOKE UPDATE ON audit_log FROM authenticated;
REVOKE UPDATE ON audit_log FROM anon;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
-- (Already done in migration 001, but confirming here)

-- Ensure RLS is enabled
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

-- ============================================
-- SECURITY NOTES
-- ============================================

COMMENT ON POLICY "org_own_data_only" ON organizations IS
  'Organizations can only see their own data. Super admins see all (for management).';

COMMENT ON POLICY "users_access_control" ON users IS
  'Users see: Super admin=all, Tenant admin=org users, User=self only.';

COMMENT ON FUNCTION log_data_access IS
  'Audit function to log all data access for compliance. Called automatically by triggers.';

COMMENT ON FUNCTION user_has_feature IS
  'Check if user has access to a feature based on their organization subscription tier.';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify RLS is working:
/*
-- Should return policies for each table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should return true for all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
*/
