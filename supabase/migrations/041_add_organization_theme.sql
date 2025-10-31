-- Add theme customization fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS theme_primary_color TEXT DEFAULT '#00e5c0',
ADD COLUMN IF NOT EXISTS theme_secondary_color TEXT DEFAULT '#033c3a',
ADD COLUMN IF NOT EXISTS theme_accent_color TEXT DEFAULT '#0eafaa',
ADD COLUMN IF NOT EXISTS theme_text_color TEXT DEFAULT '#e6ffff',
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark'));

-- Comment on columns
COMMENT ON COLUMN organizations.theme_primary_color IS 'Primary brand color (used for buttons, highlights)';
COMMENT ON COLUMN organizations.theme_secondary_color IS 'Secondary brand color (used for backgrounds, sidebars)';
COMMENT ON COLUMN organizations.theme_accent_color IS 'Accent color (used for hovers, active states)';
COMMENT ON COLUMN organizations.theme_text_color IS 'Text color for dark backgrounds';
COMMENT ON COLUMN organizations.theme_mode IS 'Light or dark mode preference';
