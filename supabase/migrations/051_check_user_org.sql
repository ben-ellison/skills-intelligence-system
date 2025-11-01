-- Check which organization the super admin belongs to
SELECT
  u.id as user_id,
  u.email,
  u.auth0_user_id,
  u.is_super_admin,
  u.status,
  u.organization_id,
  o.name as org_name,
  o.subdomain as org_subdomain
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'ben.ellison@edvanceiq.co.uk';

-- Also check if demo1 exists and what its ID is
SELECT id, name, subdomain
FROM organizations
WHERE subdomain = 'demo1';
