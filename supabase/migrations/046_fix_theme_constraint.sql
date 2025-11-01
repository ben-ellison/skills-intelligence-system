-- Drop the old constraint that's causing issues
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_theme_set_name_check;

-- Add a new constraint with all theme options
ALTER TABLE organizations
ADD CONSTRAINT organizations_theme_set_name_check
CHECK (theme_set_name IN ('aivii', 'ocean', 'forest', 'sunset', 'corporate', 'purple', 'monochrome'));

-- Also fix users table constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_theme_mode_check;

ALTER TABLE users
ADD CONSTRAINT users_theme_mode_check
CHECK (theme_mode IN ('light', 'dark'));
