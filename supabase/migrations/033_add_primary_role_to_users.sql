-- ============================================
-- MIGRATION 033: Add Primary Role to Users
-- ============================================
-- Users can have multiple roles via user_roles table
-- This adds a primary_role_id to determine which role's
-- Immediate Priorities report to show on the Summary page

-- Add primary role reference to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS primary_role_id UUID REFERENCES global_roles(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.primary_role_id IS 'User''s primary role - determines which Immediate Priorities report to show';

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role_id);

-- Helper function to auto-set primary role when user is assigned their first role
-- This ensures users always have a primary_role_id if they have any roles
CREATE OR REPLACE FUNCTION auto_set_primary_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If user doesn't have a primary role yet, set it to this newly assigned role
  UPDATE users
  SET primary_role_id = NEW.global_role_id
  WHERE id = NEW.user_id
    AND primary_role_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set primary role when a role is assigned
DROP TRIGGER IF EXISTS auto_set_primary_role_trigger ON user_roles;
CREATE TRIGGER auto_set_primary_role_trigger
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_primary_role();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 033 completed successfully!';
  RAISE NOTICE '✓ Added primary_role_id to users table';
  RAISE NOTICE '✓ Created auto-assignment trigger for first role';
  RAISE NOTICE '✓ Users will now have a primary role for Immediate Priorities';
END $$;
