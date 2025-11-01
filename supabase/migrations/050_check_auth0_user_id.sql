-- Check if super admin has auth0_user_id set
SELECT
  id,
  email,
  auth0_user_id,
  is_super_admin,
  is_tenant_admin,
  organization_id,
  status
FROM users
WHERE email = 'ben.ellison@edvanceiq.co.uk';

-- If auth0_user_id is NULL, that's why the session enrichment fails!
-- The session callback looks up users by auth0_user_id (line 68 in auth-options.ts)
-- So the session doesn't get the is_super_admin flag, and the tenant layout rejects access
