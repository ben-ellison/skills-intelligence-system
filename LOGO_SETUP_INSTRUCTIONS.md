# Organisation Logo Setup Instructions

## Step 1: Run Database Migration

You need to add the `logo_url` column to the organizations table. Run this SQL in your Supabase SQL Editor:

```sql
-- Add logo_url column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN organizations.logo_url IS 'URL to the organization logo image stored in Supabase Storage';
```

## Step 2: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click on "Storage" in the left sidebar
3. Click "Create a new bucket"
4. Bucket name: `public-assets`
5. **Important:** Make sure "Public bucket" is **ENABLED** (toggle should be ON)
6. Click "Create bucket"

## Step 3: Set Storage Bucket Policies

After creating the bucket, you need to set up the access policies:

1. Click on the `public-assets` bucket
2. Go to "Policies" tab
3. Add the following policies:

### Policy 1: Public Read Access
- **Policy name:** "Public read access"
- **Allowed operation:** SELECT
- **Target roles:** public
- **Policy definition:**
  ```
  true
  ```
  Or use the "Allow public read access" template

### Policy 2: Authenticated Upload
- **Policy name:** "Authenticated users can upload"
- **Allowed operation:** INSERT
- **Target roles:** authenticated
- **Policy definition:**
  ```
  true
  ```

### Policy 3: Authenticated Update/Delete
- **Policy name:** "Authenticated users can update/delete"
- **Allowed operation:** UPDATE, DELETE
- **Target roles:** authenticated
- **Policy definition:**
  ```
  true
  ```

**Easier Alternative:** When creating the bucket, simply toggle "Public bucket" to ON. This automatically sets up the public read policy. For INSERT/UPDATE/DELETE, the service role key used by the API bypasses RLS policies.

## Step 4: Test the Feature

1. Go to your Tenant Admin page: https://demo1.skillsintelligencesystem.co.uk/tenant-admin/organization
2. You should see a new "Organisation Logo" section at the top
3. Click "Upload Logo" and select an image file (PNG, JPG, SVG, or WebP, max 2MB)
4. The logo should upload and display in the preview
5. Hover over the logo to see the remove button (X icon)

## Verification

After completing these steps, the logo upload feature should be fully functional. The logo will:
- Display in the Organisation settings page
- Be stored in Supabase Storage under `public-assets/organization-logos/`
- Have a public URL that can be accessed anywhere
- (Next step: Display in sidebar and navigation for dual branding)

## Troubleshooting

If uploads fail:
- Check that the `public-assets` bucket exists and is public
- Verify the bucket policies are set correctly
- Check browser console for detailed error messages
- Ensure the migration ran successfully (check that `logo_url` column exists in `organizations` table)
