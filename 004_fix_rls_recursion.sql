-- Fix infinite recursion in RLS policies
-- The issue: policies were querying the same table they're protecting

-- Drop problematic policies
DROP POLICY IF EXISTS "users_access_control" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_admin_create" ON users;
DROP POLICY IF EXISTS "users_admin_delete" ON users;

-- Recreate without recursion
-- Users table: Simplified to avoid recursion
CREATE POLICY "users_select" ON users
  FOR SELECT
  USING (
    -- Users can see themselves
    auth.uid() = auth_user_id
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE
  USING (
    -- Users can update themselves
    auth.uid() = auth_user_id
  );

-- For admin operations, we'll use service role key
-- (which bypasses RLS entirely)

-- Fix other potential recursion issues
DROP POLICY IF EXISTS "user_additional_reports_admin" ON user_additional_reports;

CREATE POLICY "user_additional_reports_select" ON user_additional_reports
  FOR SELECT
  USING (
    -- Users see their own additional reports
    user_id IN (
      SELECT id FROM users WHERE auth.uid() = auth_user_id
    )
  );

-- Super admin and tenant admin operations will use service role
COMMENT ON TABLE users IS 'Use service role key for admin user management operations';
