-- Check exact email format in database
SELECT
  id,
  email,
  length(email) as email_length,
  is_super_admin,
  organization_id
FROM users
WHERE email ILIKE '%ben.ellison%';

-- Also check for any whitespace or case differences
SELECT
  id,
  email,
  lower(trim(email)) as normalized_email,
  is_super_admin
FROM users
WHERE lower(trim(email)) = 'ben.ellison@edvanceiq.co.uk';
