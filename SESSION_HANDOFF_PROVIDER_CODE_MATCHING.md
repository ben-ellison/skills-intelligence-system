# Session Handoff - Provider Code Matching System

## 🎯 Next Task: Build Intelligent Provider-Code Report Matching

### User's Brilliant Idea:
Use naming conventions in PowerBI report names to auto-match reports to organization provider configurations.

**Example Naming Convention:**
```
[LMS]-[English&Maths]-[CRM] - [Role Name] v[Version]

Examples:
- APTEM-BKSB-HUBSPOT - Operations Leader v1.2
- BUD-BKSB-SF - Senior Leader v2.0
- ONEFILE-SMARTASSESSOR-DYNAMICS - Quality Manager v1.0
- APTEM - Immediate Priorities v1.5 (no E&M, no CRM)
```

### Provider Code Mapping:
- **LMS**: `APTEM`, `BUD`, `ONEFILE`
- **English & Maths**: `BKSB`, `FUNC` (Functional Skills), `SMARTASSESSOR`
- **CRM**: `HUBSPOT`, `SF` (Salesforce), `DYNAMICS`, `ZOHO`
- **HR**: `SAGEHR`, `BAMBOOHR`

### The Problem We're Solving:
User has ~400 total reports across different provider combinations. When deploying to a new organization (e.g., Acme Training with Aptem + BKSB + HubSpot), system should automatically:
1. Detect their provider configuration (Aptem, BKSB, HubSpot)
2. Find ALL reports matching "APTEM-BKSB-HUBSPOT-*"
3. Deploy those ~40 reports in bulk
4. Store mappings in database

No manual entry of 40 reports per deployment!

## ✅ What's Already Built (8 Migrations Deployed):

1. **001_initial_schema.sql** - Organizations, users, subscriptions, roles
2. **002_security_rls_policies.sql** - Row level security
3. **003_seed_data.sql** - Initial tiers and roles
4. **004_disable_rls_for_testing.sql** - RLS disabled
5. **005_add_auth0_fields.sql** - Auth0 integration
6. **006_integration_presets.sql** - Integration providers (deprecated)
7. **007_refactor_to_category_based_integrations.sql** - Category-based selection
8. **008_powerbi_multi_workspace_architecture.sql** - Multi-workspace support with templates

### Key Tables:
- `integration_providers` - Aptem, Bud, OneFile, BKSB, HubSpot, Salesforce, etc.
- `organizations` - Has `lms_provider_id`, `english_maths_provider_id`, `crm_provider_id`, `hr_provider_id`
- `powerbi_reports` - Templates with `is_template` flag
- `organization_powerbi_reports` - Deployed report instances per org
- `powerbi_deployment_log` - Audit trail

### Working Features:
- ✅ Auth0 authentication with RBAC
- ✅ Organization creation with category-based integration selection
- ✅ PowerBI Reports Manager (1 template: "Operations Leader Dashboard")
- ✅ Super Admin Portal with quick actions
- ✅ Multi-workspace architecture

## 🔨 What Needs to Be Built:

### Migration 009: Add Provider Code Fields
```sql
ALTER TABLE powerbi_reports
ADD COLUMN provider_code TEXT, -- e.g., "APTEM-BKSB-HUBSPOT"
ADD COLUMN lms_code TEXT, -- e.g., "APTEM"
ADD COLUMN english_maths_code TEXT, -- e.g., "BKSB"
ADD COLUMN crm_code TEXT, -- e.g., "HUBSPOT"
ADD COLUMN hr_code TEXT, -- e.g., "SAGEHR"
ADD COLUMN role_name TEXT, -- e.g., "Operations Leader"
ADD COLUMN report_version TEXT; -- e.g., "1.2"

-- Function to auto-parse report name and extract codes
CREATE OR REPLACE FUNCTION parse_report_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Parse "APTEM-BKSB-HUBSPOT - Operations Leader v1.2"
  -- Extract provider codes and metadata
  -- Auto-populate the code fields
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Bulk Deployment Interface
Build: `/super-admin/organizations/[id]/deploy-reports`

**Features:**
1. **Auto-Detect Mode:**
   - Reads org's provider configuration
   - Builds provider code: "APTEM-BKSB-HUBSPOT"
   - Finds ALL matching templates
   - Shows preview: "Found 42 matching reports"
   - Click "Deploy All" → bulk deployment

2. **Manual Fetch Mode:**
   - Enter organization's PowerBI Workspace ID
   - Fetch all reports from that workspace via PowerBI API
   - Auto-match to templates by name parsing
   - Show mapping table for review
   - Bulk save

3. **CSV Import:**
   - Upload CSV: `template_id, deployed_report_id, workspace_id`
   - Bulk insert into `organization_powerbi_reports`

### Matching Algorithm:
```javascript
function findMatchingReports(organization) {
  // Get org's providers
  const lms = getProviderCode(org.lms_provider_id); // "APTEM"
  const em = getProviderCode(org.english_maths_provider_id); // "BKSB"
  const crm = getProviderCode(org.crm_provider_id); // "HUBSPOT"

  // Build pattern
  const pattern = `${lms}-${em}-${crm}`;

  // Find all matching templates
  return db.powerbi_reports.where({
    provider_code: pattern,
    is_template: true
  });
}
```

## 📁 Files to Create:

1. `009_provider_code_matching.sql` - Migration
2. `app/super-admin/organizations/[id]/deploy-reports/page.tsx` - Deployment UI
3. `app/api/super-admin/organizations/[id]/deploy-reports/route.ts` - API
4. `lib/powerbi/code-matcher.ts` - Matching logic

## 🎯 Acceptance Criteria:

- [ ] Super Admin can add report template with name "APTEM-BKSB-HUBSPOT - Operations Leader v1.2"
- [ ] System auto-parses and extracts provider codes
- [ ] When deploying to org with Aptem+BKSB+HubSpot, system finds all matching reports
- [ ] Bulk deployment shows count: "42 reports found for APTEM-BKSB-HUBSPOT"
- [ ] Can deploy all in one click
- [ ] Stores mappings in `organization_powerbi_reports` table

## 🐛 Known Issues:

- 29 stuck bash background processes (cleared Node processes but bash shells remain)
- Clean up with: `pkill -9 -f "npm run dev"`
- Restart with: `cd /Users/bcdra/Desktop/skills-intelligence-system && npm run dev`

## 📊 Progress:
- Database: 8/10 migrations complete (need 009, possibly 010)
- Super Admin Portal: 40% complete
- PowerBI Integration: 30% complete (templates ready, deployment needed)
- Multi-tenancy: 100% complete
- Auth: 100% complete

## 🚀 Start Here:
```bash
# Kill stuck processes
pkill -9 -f "npm run dev"

# Start fresh dev server
cd /Users/bcdra/Desktop/skills-intelligence-system
npm run dev

# Continue with Migration 009
open http://localhost:3000/super-admin
```
