-- Drop existing policies that might be blocking theme updates
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Tenant admins can update their organization" ON organizations;

-- Recreate policy to allow tenant admins to update their organization including theme
CREATE POLICY "Tenant admins can update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM users
    WHERE auth.uid() = id
    AND is_tenant_admin = true
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id
    FROM users
    WHERE auth.uid() = id
    AND is_tenant_admin = true
  )
);

-- Ensure service role can bypass RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
