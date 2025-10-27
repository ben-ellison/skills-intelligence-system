-- ============================================
-- ROLES TABLE
-- ============================================
-- Core roles table for the platform
-- Links to Auth0 roles but stored in Supabase for easier querying

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Role identification
  name TEXT UNIQUE NOT NULL, -- e.g., "Skills Coach", "Operations Leader"
  display_name TEXT NOT NULL,
  description TEXT,

  -- Auth0 integration
  auth0_role_id TEXT, -- Auth0 role ID for syncing

  -- Permissions/capabilities
  permissions JSONB DEFAULT '{}',

  -- Hierarchy
  level INTEGER DEFAULT 0, -- 0=user, 10=manager, 20=leader, 30=senior leader

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_roles_level ON roles(level);

COMMENT ON TABLE roles IS 'Platform roles - linked to Auth0 for authentication';
COMMENT ON COLUMN roles.level IS 'Hierarchy level: 0=user, 10=manager, 20=leader, 30=senior';

-- ============================================
-- SEED ROLES
-- ============================================

INSERT INTO roles (name, display_name, description, level, is_active) VALUES
  ('Super Admin', 'Super Admin', 'Platform administrator with full access', 100, true),
  ('Senior Leader', 'Senior Leader', 'Senior leadership with access to all modules', 30, true),
  ('Operations Leader', 'Operations Leader', 'Operations leadership role', 20, true),
  ('Operations Manager', 'Operations Manager', 'Operations management role', 10, true),
  ('Quality Leader', 'Quality Leader', 'Quality leadership role', 20, true),
  ('Quality Manager', 'Quality Manager', 'Quality management role', 10, true),
  ('Sales Leader', 'Sales Leader', 'Sales leadership role', 20, true),
  ('Salesperson', 'Salesperson', 'Sales representative role', 0, true),
  ('Compliance Leader', 'Compliance Leader', 'Compliance leadership role', 20, true),
  ('Skills Coach', 'Skills Coach', 'Skills coaching role', 0, true),
  ('Learning Support Coach', 'Learning Support Coach', 'Learning support role', 0, true),
  ('Internal Quality Assurer', 'Internal Quality Assurer', 'IQA role', 10, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles (needed for role selection in UI)
CREATE POLICY "Roles are viewable by everyone" ON roles
  FOR SELECT USING (true);

-- Only super admins can modify roles
CREATE POLICY "Only super admins can modify roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE name = 'Super Admin')
    )
  );
