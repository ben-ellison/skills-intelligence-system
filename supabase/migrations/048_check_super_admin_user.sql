-- Check super admin user exists and has correct flags
SELECT
  id,
  email,
  organization_id,
  is_super_admin,
  is_tenant_admin,
  status,
  created_at
FROM users
WHERE email = 'ben.ellison@edvanceiq.co.uk';

-- Check which organization the super admin belongs to
SELECT
  u.email,
  u.is_super_admin,
  o.name as org_name,
  o.subdomain
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'ben.ellison@edvanceiq.co.uk';
