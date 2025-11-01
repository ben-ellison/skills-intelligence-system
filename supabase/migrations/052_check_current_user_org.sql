-- Check which organization the super admin is currently assigned to
SELECT
  u.email,
  u.organization_id,
  o.name as org_name,
  o.subdomain,
  u.is_super_admin
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'ben.ellison@edvanceiq.co.uk';

-- This will show which organization's data the super admin is seeing
