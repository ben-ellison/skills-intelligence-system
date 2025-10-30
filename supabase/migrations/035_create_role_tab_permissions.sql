-- Create table for role-tab permissions (global tabs only)
CREATE TABLE IF NOT EXISTS global_role_tab_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES global_roles(id) ON DELETE CASCADE NOT NULL,
  tab_id UUID REFERENCES module_tabs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, tab_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_tab_permissions_role ON global_role_tab_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_tab_permissions_tab ON global_role_tab_permissions(tab_id);

-- Seed Default Tab Permissions
-- Senior Leader gets ALL tabs in ALL modules they have access to
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
INNER JOIN global_modules gm ON mt.module_name = gm.name
INNER JOIN global_role_module_permissions grmp ON gr.id = grmp.role_id AND gm.id = grmp.module_id
WHERE gr.name = 'Senior Leader'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Operations roles get ALL tabs in Operations module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name IN ('Operations Leader', 'Operations Manager')
  AND mt.module_name = 'operations'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Quality roles get ALL tabs in Quality module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name IN ('Quality Leader', 'Quality Manager')
  AND mt.module_name = 'quality'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Sales roles get ALL tabs in Sales module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name IN ('Sales Leader', 'Sales Manager')
  AND mt.module_name = 'sales'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Compliance roles get ALL tabs in Compliance module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name IN ('Compliance Leader', 'Compliance Manager')
  AND mt.module_name = 'compliance'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Skills Coach gets ALL tabs in Learner module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name = 'Skills Coach'
  AND mt.module_name = 'learner'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Learner gets ALL tabs in Learner module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name = 'Learner'
  AND mt.module_name = 'learner'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- AAF role gets ALL tabs in AAF module
INSERT INTO global_role_tab_permissions (role_id, tab_id)
SELECT gr.id as role_id, mt.id as tab_id
FROM global_roles gr
CROSS JOIN module_tabs mt
WHERE gr.name = 'AAF'
  AND mt.module_name = 'aaf'
  AND mt.is_active = true
ON CONFLICT (role_id, tab_id) DO NOTHING;

-- Helper Function: Get Accessible Tabs for User in a Module
CREATE OR REPLACE FUNCTION get_accessible_tabs_for_user(
  p_user_id UUID,
  p_module_name TEXT
)
RETURNS TABLE (
  tab_id UUID,
  tab_name TEXT,
  report_id TEXT,
  workspace_id TEXT,
  page_name TEXT,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    mt.id,
    mt.tab_name,
    mt.report_id,
    mt.workspace_id,
    mt.page_name,
    mt.sort_order
  FROM module_tabs mt
  INNER JOIN global_role_tab_permissions grtp ON mt.id = grtp.tab_id
  INNER JOIN user_roles ur ON grtp.role_id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND mt.module_name = p_module_name
    AND mt.is_active = true
  ORDER BY mt.sort_order;
END;
$$ LANGUAGE plpgsql;
