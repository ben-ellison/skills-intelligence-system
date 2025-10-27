-- ============================================
-- ADD ROLE_ID TO USERS TABLE
-- ============================================
-- This migration adds the role_id column to users table
-- Must run BEFORE creating roles table (due to RLS policies)

-- Add role_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role_id UUID;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

COMMENT ON COLUMN users.role_id IS 'References roles.id - user role for platform access control';
