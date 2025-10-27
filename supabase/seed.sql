-- ============================================
-- SEED DATA - Skills Intelligence System
-- ============================================
-- Initial data for development and testing

-- ============================================
-- 1. SUBSCRIPTION TIERS
-- ============================================
INSERT INTO subscription_tiers (name, display_name, description, features, sort_order) VALUES
(
  'core',
  'Core',
  'Essential reporting and analytics for small training providers',
  '{
    "view_reports": true,
    "custom_branding": "basic",
    "unlimited_users": true,
    "ai_summary": false,
    "ai_chat": false,
    "ai_predictive_analytics": false,
    "ai_custom_queries": false,
    "additional_report_grants": false,
    "export_reports": false,
    "api_access": false,
    "custom_roles": false,
    "scheduled_reports": false,
    "data_retention_years": 1,
    "support_level": "email"
  }'::jsonb,
  1
),
(
  'clarity',
  'Clarity',
  'Advanced analytics and customization for growing providers',
  '{
    "view_reports": true,
    "custom_branding": "full",
    "unlimited_users": true,
    "ai_summary": false,
    "ai_chat": false,
    "ai_predictive_analytics": false,
    "ai_custom_queries": false,
    "additional_report_grants": true,
    "export_reports": true,
    "api_access": false,
    "custom_roles": false,
    "scheduled_reports": true,
    "data_retention_years": 2,
    "support_level": "priority"
  }'::jsonb,
  2
),
(
  'intelligence',
  'Intelligence',
  'Full AI-powered insights and predictive analytics',
  '{
    "view_reports": true,
    "custom_branding": "white_label",
    "unlimited_users": true,
    "ai_summary": true,
    "ai_chat": true,
    "ai_predictive_analytics": true,
    "ai_custom_queries": true,
    "additional_report_grants": true,
    "export_reports": true,
    "api_access": true,
    "custom_roles": true,
    "scheduled_reports": true,
    "data_retention_years": 999,
    "support_level": "dedicated"
  }'::jsonb,
  3
);

-- ============================================
-- 2. PRICING BRACKETS (15 per tier = 45 total)
-- ============================================
-- Core tier brackets
INSERT INTO pricing_brackets (subscription_tier_id, min_learners, max_learners, monthly_price, yearly_price)
SELECT id, 0, 150, 399.00, 3990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 151, 200, 499.00, 4990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 201, 350, 599.00, 5990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 351, 500, 749.00, 7490.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 501, 750, 899.00, 8990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 751, 1000, 1099.00, 10990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 1001, 1250, 1299.00, 12990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 1251, 1500, 1499.00, 14990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 1501, 2000, 1799.00, 17990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 2001, 3000, 2299.00, 22990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 3001, 5000, 3299.00, 32990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 5001, 7500, 4799.00, 47990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 7501, 10000, 6499.00, 64990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 10001, 12500, 7999.00, 79990.00 FROM subscription_tiers WHERE name = 'core'
UNION ALL SELECT id, 12501, NULL, 9999.00, 99990.00 FROM subscription_tiers WHERE name = 'core';

-- Clarity tier brackets
INSERT INTO pricing_brackets (subscription_tier_id, min_learners, max_learners, monthly_price, yearly_price)
SELECT id, 0, 150, 599.00, 5990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 151, 200, 699.00, 6990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 201, 350, 799.00, 7990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 351, 500, 999.00, 9990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 501, 750, 1199.00, 11990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 751, 1000, 1449.00, 14490.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 1001, 1250, 1699.00, 16990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 1251, 1500, 1949.00, 19490.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 1501, 2000, 2399.00, 23990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 2001, 3000, 3199.00, 31990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 3001, 5000, 4699.00, 46990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 5001, 7500, 6899.00, 68990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 7501, 10000, 9499.00, 94990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 10001, 12500, 11999.00, 119990.00 FROM subscription_tiers WHERE name = 'clarity'
UNION ALL SELECT id, 12501, NULL, 14999.00, 149990.00 FROM subscription_tiers WHERE name = 'clarity';

-- Intelligence tier brackets
INSERT INTO pricing_brackets (subscription_tier_id, min_learners, max_learners, monthly_price, yearly_price)
SELECT id, 0, 150, 899.00, 8990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 151, 200, 999.00, 9990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 201, 350, 1199.00, 11990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 351, 500, 1499.00, 14990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 501, 750, 1799.00, 17990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 751, 1000, 2199.00, 21990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 1001, 1250, 2599.00, 25990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 1251, 1500, 2999.00, 29990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 1501, 2000, 3699.00, 36990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 2001, 3000, 4999.00, 49990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 3001, 5000, 7499.00, 74990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 5001, 7500, 10999.00, 109990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 7501, 10000, 14999.00, 149990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 10001, 12500, 18999.00, 189990.00 FROM subscription_tiers WHERE name = 'intelligence'
UNION ALL SELECT id, 12501, NULL, 24999.00, 249990.00 FROM subscription_tiers WHERE name = 'intelligence';

-- ============================================
-- 3. GLOBAL ROLES
-- ============================================
INSERT INTO global_roles (name, display_name, description, icon, sort_order) VALUES
('senior_leader', 'Senior Leader', 'Strategic oversight and executive decision-making', 'users', 1),
('operations_leader', 'Operations Leader', 'Operational management and process optimization', 'settings', 2),
('quality_leader', 'Quality Leader', 'Quality assurance and compliance', 'check-circle', 3),
('compliance_leader', 'Compliance Leader', 'Regulatory compliance and audit management', 'shield', 4),
('sales_leader', 'Sales Leader', 'Business development and sales tracking', 'trending-up', 5),
('aaf_leader', 'AAF Leader', 'Apprenticeship Accountability Framework oversight', 'file-text', 6),
('qar_scenarios_leader', 'QAR Scenarios Leader', 'Quality Assurance Review scenario planning', 'bar-chart', 7),
('funding_info_leader', 'Funding Info Leader', 'Funding and financial tracking', 'pound-sterling', 8);

-- ============================================
-- 4. DEMO ORGANIZATION (for testing)
-- ============================================
INSERT INTO organizations (
  name,
  subdomain,
  subscription_tier_id,
  subscription_status,
  billing_cycle,
  current_learner_count,
  max_learner_count_this_period,
  subscription_starts_at,
  trial_ends_at,
  billing_email,
  theme_config
)
SELECT
  'Demo Training Provider',
  'demo1',
  id,
  'active',
  'monthly',
  222,
  222,
  NOW(),
  NOW() + INTERVAL '30 days',
  'billing@demo-provider.co.uk',
  '{
    "primary_color": "#0f766e",
    "secondary_color": "#14b8a6",
    "accent_color": "#5eead4",
    "logo_url": null
  }'::jsonb
FROM subscription_tiers WHERE name = 'intelligence';

-- ============================================
-- 5. DEMO SUPER ADMIN USER
-- ============================================
INSERT INTO users (
  email,
  name,
  organization_id,
  is_super_admin,
  is_tenant_admin,
  status
) VALUES (
  'admin@skillsintelligence.co.uk',
  'System Administrator',
  NULL, -- Super admins don't belong to an org
  true,
  false,
  'active'
);

-- ============================================
-- 6. DEMO TENANT ADMIN USER
-- ============================================
INSERT INTO users (
  email,
  name,
  organization_id,
  is_super_admin,
  is_tenant_admin,
  status
)
SELECT
  'admin@demo-provider.co.uk',
  'Demo Provider Admin',
  id,
  false,
  true,
  'active'
FROM organizations WHERE subdomain = 'demo1';

-- ============================================
-- 7. DEMO REGULAR USERS
-- ============================================
INSERT INTO users (
  email,
  name,
  organization_id,
  is_super_admin,
  is_tenant_admin,
  status
)
SELECT
  'senior.leader@demo-provider.co.uk',
  'John Smith',
  id,
  false,
  false,
  'active'
FROM organizations WHERE subdomain = 'demo1'
UNION ALL
SELECT
  'operations.leader@demo-provider.co.uk',
  'Sarah Johnson',
  id,
  false,
  false,
  'active'
FROM organizations WHERE subdomain = 'demo1';

-- ============================================
-- 8. ASSIGN ROLES TO DEMO USERS
-- ============================================
-- Senior Leader role
INSERT INTO user_roles (user_id, global_role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN global_roles r
WHERE u.email = 'senior.leader@demo-provider.co.uk'
AND r.name = 'senior_leader';

-- Operations Leader role
INSERT INTO user_roles (user_id, global_role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN global_roles r
WHERE u.email = 'operations.leader@demo-provider.co.uk'
AND r.name = 'operations_leader';

-- ============================================
-- 9. AI SUMMARY CONFIG EXAMPLE (for Senior Leader)
-- ============================================
INSERT INTO ai_summary_configs (
  global_role_id,
  immediate_priorities_page_name,
  role_specific_page_name,
  prompt_template,
  run_frequency,
  run_time
)
SELECT
  id,
  'Immediate Priorities',
  'Senior Leader Dashboard',
  'Write a strategic summary in British English, for senior leadership based on the dashboard. Include the total number of learners, learners in funding, and how many have recorded activity this month. Highlight key risks - include percentages for learners at Red or Amber risk, the average Off-the-Job Hours percentage, the number of overdue or pending marking items, and how many learners are missing reviews or have overdue reviews. Also mention learners with overdue activities still in progress. Mention how many learners are out of funding or due to complete within 90 days. Also include positive indicators such as funding coverage, learner engagement this month, and live Functional Skills aims. Finish with a short summary advising leaders where to focus their attention.',
  'daily',
  '06:00:00'
FROM global_roles WHERE name = 'senior_leader';

-- ============================================
-- CONFIRMATION
-- ============================================
DO $$
DECLARE
  tier_count INTEGER;
  bracket_count INTEGER;
  role_count INTEGER;
  org_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tier_count FROM subscription_tiers;
  SELECT COUNT(*) INTO bracket_count FROM pricing_brackets;
  SELECT COUNT(*) INTO role_count FROM global_roles;
  SELECT COUNT(*) INTO org_count FROM organizations;
  SELECT COUNT(*) INTO user_count FROM users;

  RAISE NOTICE '✓ Seed data loaded successfully:';
  RAISE NOTICE '  - % subscription tiers', tier_count;
  RAISE NOTICE '  - % pricing brackets', bracket_count;
  RAISE NOTICE '  - % global roles', role_count;
  RAISE NOTICE '  - % organizations', org_count;
  RAISE NOTICE '  - % users', user_count;
END $$;
