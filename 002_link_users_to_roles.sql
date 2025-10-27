-- ============================================
-- LINK USERS TO ROLES
-- ============================================
-- Adds foreign key constraint from users.role_id to roles.id
-- Must run AFTER both users and roles tables exist

-- Add foreign key constraint
ALTER TABLE users
ADD CONSTRAINT fk_users_role
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_users_role ON users IS 'Links users to their assigned role';
