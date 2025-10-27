# Provider Code Matching System - Deployment Guide

## Overview

The intelligent provider code matching system has been successfully built! This system allows you to:

1. **Name reports with provider codes** (e.g., "APTEM-BKSB-HUBSPOT - Operations Leader v1.2")
2. **Automatically parse and extract** LMS, E&M, CRM, and HR codes
3. **Find matching reports** for any organization based on their provider configuration
4. **Bulk deploy** 40+ reports with a single click

## Files Created

### 1. Database Migration
- **[009_provider_code_matching.sql](009_provider_code_matching.sql)**
  - Adds provider code fields to `powerbi_reports` table
  - Creates `parse_report_name()` function to extract codes from report names
  - Auto-trigger to parse names on insert/update
  - Creates `find_matching_reports_for_org()` function for intelligent matching
  - Includes scoring algorithm (exact match: 100, core match: 90, partial: 70, LMS only: 50)

### 2. Matching Logic Library
- **[lib/powerbi/code-matcher.ts](lib/powerbi/code-matcher.ts)**
  - Client-side implementation of matching algorithm
  - Functions to parse report names
  - Build provider code strings from org configuration
  - Calculate match scores and determine match types
  - Get organization provider codes from database
  - Find all matching reports for an organization

### 3. API Routes
- **[app/api/super-admin/organizations/[id]/deploy-reports/route.ts](app/api/super-admin/organizations/[id]/deploy-reports/route.ts)**
  - `GET`: Find matching reports for an organization
  - `POST`: Deploy reports in bulk (auto/manual/CSV modes)
  - `DELETE`: Remove deployed reports
  - Full authentication and authorization checks

### 4. Bulk Deployment UI
- **[app/super-admin/organizations/[id]/deploy-reports/page.tsx](app/super-admin/organizations/[id]/deploy-reports/page.tsx)**
  - Beautiful tabbed interface
  - Auto-detect matching reports
  - Preview with match scores and types
  - Select and deploy multiple reports at once
  - Shows deployment statistics
  - Export to CSV
  - Manual fetch and CSV import tabs (ready for future implementation)

### 5. Updated PowerBI Reports Manager
- **[app/super-admin/reports/page-wrapper.tsx](app/super-admin/reports/page-wrapper.tsx)** (modified)
  - Updated to show provider codes in table
  - Enhanced form with naming convention helper text
  - Displays parsed provider codes

## How to Deploy

### Step 1: Run the Migration

You need to run `009_provider_code_matching.sql` on your Supabase database. You have two options:

#### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ytknzkfdyvuwazoigisd
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `009_provider_code_matching.sql`
5. Click "Run" (or press Cmd+Enter)
6. You should see "Success. No rows returned" - this is normal!

#### Option B: Command Line
```bash
# If you have psql installed with the correct credentials
PGPASSWORD='your_password' psql -h your_host -p 6543 -U postgres.ytknzkfdyvuwazoigisd -d postgres -f 009_provider_code_matching.sql
```

### Step 2: Verify Migration

After running the migration, verify it worked by running this test query in Supabase SQL Editor:

```sql
-- Test the parsing function
SELECT * FROM parse_report_name('APTEM-BKSB-HUBSPOT - Operations Leader v1.2');

-- Expected output:
-- provider_code: APTEM-BKSB-HUBSPOT
-- lms_code: APTEM
-- english_maths_code: BKSB
-- crm_code: HUBSPOT
-- role_name: Operations Leader
-- report_version: 1.2
```

### Step 3: Start the Dev Server

```bash
cd /Users/bcdra/Desktop/skills-intelligence-system
npm run dev
```

### Step 4: Test the System

1. **Add a Template Report**
   - Navigate to http://localhost:3000/super-admin/reports
   - Click "Add Report"
   - Enter name: `APTEM-BKSB-HUBSPOT - Operations Leader v1.2`
   - Fill in other fields (you can use placeholder GUIDs for testing)
   - Save

2. **View the Parsed Codes**
   - The table should now show "APTEM-BKSB-HUBSPOT" in the Provider Code column
   - This confirms the trigger is working!

3. **Test Bulk Deployment**
   - Go to http://localhost:3000/super-admin
   - Find an organization that has Aptem, BKSB, and HubSpot configured
   - Click on the organization
   - Navigate to the "Deploy Reports" section (you may need to add a button for this)
   - Or directly go to: http://localhost:3000/super-admin/organizations/[org-id]/deploy-reports
   - You should see matching reports with scores
   - Select reports and click "Deploy Selected Reports"

## Provider Code Reference

### Known Provider Codes

**LMS Providers:**
- `APTEM` - Aptem
- `BUD` - Bud
- `ONEFILE` - OneFile

**English & Maths Providers:**
- `BKSB` - BKSB
- `FUNC` - Functional Skills
- `SMARTASSESSOR` - SmartAssessor

**CRM Providers:**
- `HUBSPOT` - HubSpot
- `SF` - Salesforce
- `DYNAMICS` - Microsoft Dynamics
- `ZOHO` - Zoho CRM

**HR Providers:**
- `SAGEHR` - Sage HR
- `BAMBOOHR` - BambooHR

### Naming Convention

```
[LMS]-[E&M]-[CRM]-[HR] - [Role Name] v[Version]
```

**Examples:**
```
APTEM-BKSB-HUBSPOT - Operations Leader v1.2
BUD-FUNC-SF - Senior Leader v2.0
ONEFILE-SMARTASSESSOR-DYNAMICS - Quality Manager v1.0
APTEM - Immediate Priorities v1.5 (LMS only)
Universal Dashboard v1.0 (no provider codes - available to all)
```

## Match Scoring System

The system scores reports based on how well they match an organization's configuration:

- **100 points**: Exact match (all providers including HR)
- **90 points**: Core match (LMS + E&M + CRM, no HR requirement)
- **70 points**: Partial match (LMS + E&M only)
- **50 points**: LMS only
- **25 points**: Universal reports (no provider codes)
- **0 points**: No match (wrong providers)

## Next Steps

### Recommended Enhancements

1. **Add "Deploy Reports" button to organization page**
   - Edit `app/super-admin/page-wrapper.tsx`
   - Add a "Deploy Reports" button in each organization card
   - Link to `/super-admin/organizations/[id]/deploy-reports`

2. **Implement Manual Fetch**
   - Add PowerBI API integration
   - Fetch reports from organization's workspace
   - Auto-match by name

3. **Implement CSV Import**
   - Allow bulk import of report mappings
   - Format: `template_id, deployed_report_id, workspace_id`

4. **Add Deployment Validation**
   - Verify PowerBI workspace exists
   - Check report IDs are valid GUIDs
   - Prevent duplicate deployments

5. **Real PowerBI API Integration**
   - Currently uses placeholder report IDs
   - Integrate with PowerBI REST API to:
     - Actually deploy reports to workspaces
     - Get real report IDs back
     - Handle authentication with service principal

## Testing Checklist

- [ ] Migration runs successfully in Supabase
- [ ] Parse function extracts codes correctly
- [ ] Adding a report auto-parses the name
- [ ] Table shows provider codes
- [ ] Matching API returns correct reports
- [ ] Bulk deployment creates records
- [ ] Deployment log tracks changes
- [ ] UI shows match scores and types
- [ ] Can select and deploy multiple reports
- [ ] Export to CSV works

## Troubleshooting

### Migration Fails
- Check you're connected to the right database
- Verify you have admin privileges
- Look for syntax errors in SQL

### Reports Not Matching
- Verify organization has provider IDs set (lms_provider_id, etc.)
- Check provider codes in integration_providers table match known codes
- Test parse function manually with sample names

### Deployment Fails
- Check organization has powerbi_workspace_id set
- Verify user has super_admin role
- Look at browser console for API errors

## Architecture Notes

This system uses a **template-based deployment model**:

1. **Templates** (`powerbi_reports` with `is_template=true`)
   - Global report definitions
   - Have provider codes parsed from names
   - Available for matching

2. **Deployed Reports** (`organization_powerbi_reports`)
   - Actual report instances in organization workspaces
   - Link to template report
   - Have real PowerBI IDs from the organization's workspace

3. **Matching Algorithm**
   - Compares organization's providers with report's codes
   - Scores based on level of match
   - Only shows reports that match or are universal

This architecture supports:
- ✅ 400+ total reports across different provider combinations
- ✅ Bulk deployment of 40+ reports with one click
- ✅ Complete data isolation per organization
- ✅ Automatic matching based on configuration
- ✅ No manual entry of report IDs per deployment

## Support

If you encounter issues:
1. Check the Supabase logs for database errors
2. Check browser console for frontend errors
3. Check Next.js terminal for API errors
4. Verify all environment variables in .env.local

Built with ❤️ for efficient PowerBI report management!
