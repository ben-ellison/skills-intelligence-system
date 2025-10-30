-- Add role hierarchy and user admin permissions

-- Add hierarchy fields to global_roles
ALTER TABLE global_roles ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES global_roles(id) ON DELETE SET NULL;
ALTER TABLE global_roles ADD COLUMN IF NOT EXISTS role_category TEXT;
ALTER TABLE global_roles ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_global_roles_parent ON global_roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_global_roles_category ON global_roles(role_category);

-- Add user admin permissions to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_users BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_any_user BOOLEAN DEFAULT false;

-- Update role hierarchy structure
-- Senior Leader (top level, no parent)
UPDATE global_roles SET role_level = 1, role_category = 'leadership' WHERE name = 'Senior Leader';

-- Department Leaders (level 2, parent = Senior Leader)
UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Senior Leader'),
  role_level = 2,
  role_category = 'operations'
WHERE name = 'Operations Leader';

UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Senior Leader'),
  role_level = 2,
  role_category = 'quality'
WHERE name = 'Quality Leader';

UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Senior Leader'),
  role_level = 2,
  role_category = 'compliance'
WHERE name = 'Compliance Leader';

UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Senior Leader'),
  role_level = 2,
  role_category = 'sales'
WHERE name = 'Sales Leader';

-- Department Managers (level 3, parent = respective Leader)
UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Operations Leader'),
  role_level = 3,
  role_category = 'operations'
WHERE name = 'Operations Manager';

UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Quality Leader'),
  role_level = 3,
  role_category = 'quality'
WHERE name = 'Quality Manager';

-- Individual Contributors (level 4, parent = respective Manager)
UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Operations Manager'),
  role_level = 4,
  role_category = 'operations'
WHERE name = 'Skills Coach';

UPDATE global_roles
SET
  parent_role_id = (SELECT id FROM global_roles WHERE name = 'Quality Manager'),
  role_level = 4,
  role_category = 'quality'
WHERE name = 'Internal Quality Assurer';

-- Helper Function: Check if user can assign a specific role
CREATE OR REPLACE FUNCTION can_user_assign_role(
  p_user_id UUID,
  p_target_role_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_is_tenant_admin BOOLEAN;
  v_user_can_create_any BOOLEAN;
  v_user_roles UUID[];
  v_target_role_level INTEGER;
  v_target_role_category TEXT;
  v_target_role_name TEXT;
  v_user_role_level INTEGER;
  v_user_role_category TEXT;
  v_has_senior_leader BOOLEAN;
BEGIN
  -- Get user's admin status and permissions
  SELECT is_tenant_admin, can_create_any_user INTO v_user_is_tenant_admin, v_user_can_create_any
  FROM users WHERE id = p_user_id;

  -- Tenant Admin can assign ANY role
  IF v_user_is_tenant_admin THEN
    RETURN TRUE;
  END IF;

  -- Get target role details
  SELECT role_level, role_category, name INTO v_target_role_level, v_target_role_category, v_target_role_name
  FROM global_roles WHERE id = p_target_role_id;

  -- Only Tenant Admin can assign Senior Leader
  IF v_target_role_name = 'Senior Leader' THEN
    RETURN FALSE;
  END IF;

  -- Get user's roles
  SELECT ARRAY_AGG(global_role_id) INTO v_user_roles
  FROM user_roles WHERE user_id = p_user_id;

  -- Check if user has Senior Leader role
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN global_roles gr ON ur.global_role_id = gr.id
    WHERE ur.user_id = p_user_id AND gr.name = 'Senior Leader'
  ) INTO v_has_senior_leader;

  -- Senior Leader can assign any role except Senior Leader
  IF v_has_senior_leader THEN
    RETURN TRUE;
  END IF;

  -- Check if user has "can create any user" permission (excludes Senior Leader and Tenant Admin)
  IF v_user_can_create_any THEN
    RETURN TRUE;
  END IF;

  -- Check category-based permissions for Leaders
  -- User must have a Leader role in the same category
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN global_roles gr ON ur.global_role_id = gr.id
    WHERE ur.user_id = p_user_id
      AND gr.role_category = v_target_role_category
      AND gr.role_level = 2 -- Leader level
      AND v_target_role_level > 2 -- Can only assign roles below Leader
  ) INTO v_user_role_level;

  RETURN v_user_role_level;
END;
$$ LANGUAGE plpgsql;

-- Helper Function: Get assignable roles for a user
CREATE OR REPLACE FUNCTION get_assignable_roles_for_user(p_user_id UUID)
RETURNS TABLE (
  role_id UUID,
  role_name TEXT,
  role_display_name TEXT,
  role_category TEXT,
  role_level INTEGER
) AS $$
DECLARE
  v_user_is_tenant_admin BOOLEAN;
  v_has_senior_leader BOOLEAN;
  v_user_categories TEXT[];
BEGIN
  -- Get user's admin status
  SELECT is_tenant_admin INTO v_user_is_tenant_admin
  FROM users WHERE id = p_user_id;

  -- Tenant Admin can assign ALL roles
  IF v_user_is_tenant_admin THEN
    RETURN QUERY
    SELECT id, name, display_name, role_category, role_level
    FROM global_roles
    WHERE is_active = true
    ORDER BY role_level, sort_order;
    RETURN;
  END IF;

  -- Check if user has Senior Leader role
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN global_roles gr ON ur.global_role_id = gr.id
    WHERE ur.user_id = p_user_id AND gr.name = 'Senior Leader'
  ) INTO v_has_senior_leader;

  -- Senior Leader can assign all roles except Senior Leader
  IF v_has_senior_leader THEN
    RETURN QUERY
    SELECT id, name, display_name, role_category, role_level
    FROM global_roles
    WHERE is_active = true AND name != 'Senior Leader'
    ORDER BY role_level, sort_order;
    RETURN;
  END IF;

  -- Get user's leader categories
  SELECT ARRAY_AGG(DISTINCT gr.role_category) INTO v_user_categories
  FROM user_roles ur
  JOIN global_roles gr ON ur.global_role_id = gr.id
  WHERE ur.user_id = p_user_id AND gr.role_level = 2; -- Leaders

  -- Return roles in user's categories that are below Leader level
  RETURN QUERY
  SELECT id, name, display_name, role_category, role_level
  FROM global_roles
  WHERE is_active = true
    AND role_category = ANY(v_user_categories)
    AND role_level > 2
  ORDER BY role_level, sort_order;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN global_roles.parent_role_id IS 'Parent role in hierarchy (NULL for top-level roles)';
COMMENT ON COLUMN global_roles.role_category IS 'Category: operations, quality, sales, compliance, etc.';
COMMENT ON COLUMN global_roles.role_level IS 'Hierarchy level: 1=Senior Leader, 2=Department Leader, 3=Manager, 4=Individual Contributor';
COMMENT ON COLUMN users.can_create_users IS 'Can create users in own hierarchy';
COMMENT ON COLUMN users.can_create_any_user IS 'Can create any user except Tenant Admin and Senior Leader';
