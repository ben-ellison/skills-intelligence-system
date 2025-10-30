-- ============================================
-- MIGRATION 034: Create Role-Module Permissions System
-- ============================================
-- Allows Super Admin to configure which modules each global role can access

-- Create table for role-module permissions
CREATE TABLE IF NOT EXISTS global_role_module_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES global_modules(id) ON DELETE CASCADE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each role can only have one permission entry per module
  UNIQUE(role_id, module_id)
);

COMMENT ON TABLE global_role_module_permissions IS 'Defines which modules each global role has access to';
COMMENT ON COLUMN global_role_module_permissions.role_id IS 'The global role';
COMMENT ON COLUMN global_role_module_permissions.module_id IS 'The module this role can access';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role ON global_role_module_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module ON global_role_module_permissions(module_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_role_module_permissions_updated_at ON global_role_module_permissions;
CREATE TRIGGER update_role_module_permissions_updated_at
  BEFORE UPDATE ON global_role_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Default Permissions
-- ============================================
-- Senior Leader gets access to ALL modules

INSERT INTO global_role_module_permissions (role_id, module_id)
SELECT 
  gr.id as role_id,
  gm.id as module_id
FROM global_roles gr
CROSS JOIN global_modules gm
WHERE gr.name = 'Senior Leader'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Operations roles get access to Operations module
INSERT INTO global_role_module_permissions (role_id, module_id)
SELECT 
  gr.id as role_id,
  gm.id as module_id
FROM global_roles gr
CROSS JOIN global_modules gm
WHERE gr.name IN ('Operations Leader', 'Operations Manager')
  AND gm.name = 'operations'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Quality roles get access to Quality module
INSERT INTO global_role_module_permissions (role_id, module_id)
SELECT 
  gr.id as role_id,
  gm.id as module_id
FROM global_roles gr
CROSS JOIN global_modules gm
WHERE gr.name IN ('Quality Leader', 'Quality Manager')
  AND gm.name = 'quality'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Sales roles get access to Sales module
INSERT INTO global_role_module_permissions (role_id, module_id)
SELECT 
  gr.id as role_id,
  gm.id as module_id
FROM global_roles gr
CROSS JOIN global_modules gm
WHERE gr.name IN ('Sales Leader', 'Sales Manager')
  AND gm.name = 'sales'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Skills Coach gets access to Learner module
INSERT INTO global_role_module_permissions (role_id, module_id)
SELECT 
  gr.id as role_id,
  gm.id as module_id
FROM global_roles gr
CROSS JOIN global_modules gm
WHERE gr.name = 'Skills Coach'
  AND gm.name = 'learner'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Learner gets access to Learner module only
INSERT INTO global_role_module_permissions (role_id, module_id)
SELECT 
  gr.id as role_id,
  gm.id as module_id
FROM global_roles gr
CROSS JOIN global_modules gm
WHERE gr.name = 'Learner'
  AND gm.name = 'learner'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- ============================================
-- Helper Function: Get Accessible Modules for User
-- ============================================

CREATE OR REPLACE FUNCTION get_accessible_modules_for_user(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_name TEXT,
  module_display_name TEXT,
  module_icon TEXT,
  module_sort_order INTEGER
) AS $$
BEGIN
  -- Get all modules the user's roles have access to
  RETURN QUERY
  SELECT DISTINCT
    gm.id as module_id,
    gm.name as module_name,
    gm.display_name as module_display_name,
    gm.icon_name as module_icon,
    gm.sort_order as module_sort_order
  FROM global_modules gm
  INNER JOIN global_role_module_permissions grmp ON gm.id = grmp.module_id
  INNER JOIN user_roles ur ON grmp.role_id = ur.global_role_id
  WHERE ur.user_id = p_user_id
    AND gm.is_active = true
  ORDER BY gm.sort_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_accessible_modules_for_user IS 'Returns all modules a user can access based on their role permissions';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 034 completed successfully!';
  RAISE NOTICE '✓ Created global_role_module_permissions table';
  RAISE NOTICE '✓ Seeded default role permissions';
  RAISE NOTICE '✓ Created get_accessible_modules_for_user function';
END $$;
