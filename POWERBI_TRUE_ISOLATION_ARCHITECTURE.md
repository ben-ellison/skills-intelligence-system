# PowerBI True Data Isolation Architecture

## ✅ Requirement: FULL DATA ISOLATION - NO SHARED DATASETS

You're absolutely right to demand this. Full data isolation is critical for:
- ✅ Security compliance (no risk of RLS bugs exposing other org's data)
- ✅ Enterprise customer requirements
- ✅ Regulatory compliance (GDPR, SOC2, etc.)
- ✅ Customer trust and contractual obligations

## The Correct Multi-Tenant PowerBI Architecture

### Model: Database-per-Organization + Workspace-per-Organization

```
Organization: Acme Training
├── Database: Acme's Supabase Project/Schema
│   ├── Their learners table
│   ├── Their apprenticeships table
│   └── Their data ONLY
│
├── PowerBI Workspace: "Acme Training Workspace"
│   ├── Dataset: "Acme Main Dataset"
│   │   └── Connected to ACME'S database
│   │
│   └── Reports (42 reports for APTEM+BKSB+HUBSPOT):
│       ├── Operations Leader v1.2
│       ├── Quality Manager v1.2
│       └── ... (40 more)
│           └── All use "Acme Main Dataset"

Organization: Beta Corp
├── Database: Beta's Supabase Project/Schema
│   └── Completely separate data
│
├── PowerBI Workspace: "Beta Corp Workspace"
│   ├── Dataset: "Beta Main Dataset"
│   │   └── Connected to BETA'S database
│   │
│   └── Reports (35 reports for BUD+FUNC+SF):
│       └── All use "Beta Main Dataset"
```

## How This Actually Works

### Phase 1: Template Development (Your Side)

```
Your Master Workspace: "Skills Intelligence - Templates"

Dataset: "Template Dataset"
├── Connected to a SAMPLE database
└── Contains all tables/relationships

Reports (400 total):
├── APTEM-BKSB-HUBSPOT - Operations Leader v1.2
├── APTEM-BKSB-HUBSPOT - Quality Manager v1.2
├── BUD-FUNC-SF - Senior Leader v1.0
└── ...
    └── All use "Template Dataset"
```

### Phase 2: Customer Onboarding (Automated Process)

When onboarding Acme Training:

#### Step 1: Database Setup
```sql
-- Option A: Separate Supabase Project
Create new Supabase project for Acme Training
Run migration scripts
Set up their schema

-- Option B: Separate Schema in Your Project
CREATE SCHEMA acme_training;
-- Mirror all tables in their schema
CREATE TABLE acme_training.learners (...);
CREATE TABLE acme_training.apprenticeships (...);
```

#### Step 2: PowerBI Workspace Creation (via PowerBI REST API)
```javascript
// Create workspace for Acme
POST https://api.powerbi.com/v1.0/myorg/groups
{
  "name": "Acme Training Workspace"
}
// Returns: workspaceId
```

#### Step 3: Dataset Creation & Connection (via PowerBI REST API)
```javascript
// Clone template dataset structure
// Point to ACME'S database connection string
POST https://api.powerbi.com/v1.0/myorg/groups/{acmeWorkspaceId}/datasets

// Update dataset data source to Acme's database
PATCH https://api.powerbi.com/v1.0/myorg/groups/{acmeWorkspaceId}/datasets/{datasetId}/Default.UpdateDatasources
{
  "updateDetails": [{
    "datasourceSelector": {...},
    "connectionDetails": {
      "server": "acme-database.supabase.co",
      "database": "postgres"
    },
    "credentialDetails": {
      // Acme's database credentials (encrypted)
    }
  }]
}
```

#### Step 4: Report Deployment (via PowerBI REST API)
```javascript
// Your system knows Acme uses APTEM+BKSB+HUBSPOT
// Matching algorithm finds 42 reports

// For each of the 42 reports:
for (const templateReport of matchingReports) {
  // Clone report from template workspace to Acme workspace
  POST https://api.powerbi.com/v1.0/myorg/groups/{acmeWorkspaceId}/imports
  {
    "name": templateReport.name,
    "source": "Clone",
    "sourceReport": {
      "sourceReportId": templateReport.powerbi_report_id,
      "sourceWorkspaceId": "your-template-workspace-id"
    }
  }

  // PowerBI clones the report
  // Returns: New Report ID in Acme's workspace

  // Rebind report to use Acme's dataset (not template dataset)
  POST https://api.powerbi.com/v1.0/myorg/groups/{acmeWorkspaceId}/reports/{newReportId}/Rebind
  {
    "datasetId": "acme-main-dataset-id"
  }

  // Store mapping in database
  INSERT INTO organization_powerbi_reports (
    organization_id,
    template_report_id,
    powerbi_report_id, -- ← NEW report ID (in Acme's workspace)
    powerbi_workspace_id, -- ← Acme's workspace ID
    powerbi_dataset_id -- ← Acme's dataset ID
  )
}
```

## Your System's Database Schema (Already Perfect!)

```sql
-- organizations table
id: uuid
name: "Acme Training"
powerbi_workspace_id: "acme-workspace-123" ← THEIR workspace
database_connection_string: "encrypted-connection-to-acme-db"
lms_provider_id: → APTEM
english_maths_provider_id: → BKSB
crm_provider_id: → HUBSPOT

-- powerbi_reports (templates in YOUR workspace)
id: uuid
name: "APTEM-BKSB-HUBSPOT - Operations Leader v1.2"
powerbi_report_id: "template-report-abc" ← In YOUR workspace
powerbi_workspace_id: "your-template-workspace-xyz"
is_template: true
provider_code: "APTEM-BKSB-HUBSPOT"

-- organization_powerbi_reports (deployed instances)
id: uuid
organization_id: "acme-id"
template_report_id: "template-uuid"
powerbi_report_id: "acme-report-def" ← In ACME'S workspace (DIFFERENT!)
powerbi_workspace_id: "acme-workspace-123" ← ACME'S workspace
powerbi_dataset_id: "acme-dataset-456" ← ACME'S dataset
deployment_status: "active"
```

## The Complete Automated Flow

### 1. Build Templates Once
```
You:
├── Build 400 reports in your template workspace
├── Connect to sample database
├── Add to system with naming convention
└── System parses provider codes
```

### 2. Onboard New Customer (Automated)
```
Script does:
├── Create database/schema for customer
├── Create PowerBI workspace via API
├── Create dataset in their workspace
├── Connect dataset to THEIR database
├── Find matching reports (provider code matching!)
├── Clone 42 reports to their workspace
├── Rebind reports to use THEIR dataset
└── Store all mappings in database
```

### 3. Customer Uses Reports
```
Acme user logs in:
├── System knows their org_id
├── Loads reports from organization_powerbi_reports
├── Embeds reports from THEIR workspace
├── Reports show THEIR data (from THEIR database)
└── ZERO data from other orgs
```

## Database Isolation Options

### Option 1: Supabase Project per Organization (Most Isolated)
```
Acme Training: their-own-supabase-project.supabase.co
Beta Corp: their-own-supabase-project.supabase.co
Gamma Inc: their-own-supabase-project.supabase.co

Pros:
✅ Complete isolation (separate infrastructure)
✅ Customer can have admin access
✅ Can be in different regions
✅ Easiest to prove compliance

Cons:
❌ More expensive (Supabase project per customer)
❌ More complex orchestration
```

### Option 2: Schema per Organization (Cost Effective)
```
Your Supabase Project:
├── Schema: acme_training
│   ├── learners
│   └── apprenticeships
├── Schema: beta_corp
│   ├── learners
│   └── apprenticeships
└── Schema: gamma_inc

Pros:
✅ One Supabase project (cheaper)
✅ Still database-level isolation
✅ Easier to manage

Cons:
❌ Same Postgres instance (theoretical risk)
❌ Requires schema-level RLS
```

### Option 3: Database per Organization in Same Instance
```
Your Postgres:
├── Database: acme_training
├── Database: beta_corp
└── Database: gamma_inc

Pros:
✅ True database isolation
✅ One infrastructure
✅ Good isolation guarantee

Cons:
❌ Connection pooling complexity
❌ More connection strings to manage
```

## What Needs to Be Built

To make this fully automated, you need:

### 1. PowerBI Service Principal Setup
```
Azure AD:
├── Create App Registration
├── Grant PowerBI API permissions
├── Create client secret
└── Add to PowerBI tenant settings
```

### 2. PowerBI REST API Integration
```typescript
// lib/powerbi/api.ts

class PowerBIAPI {
  async createWorkspace(orgName: string): Promise<string>

  async createDataset(workspaceId: string, connectionString: string): Promise<string>

  async cloneReport(
    templateReportId: string,
    targetWorkspaceId: string,
    targetDatasetId: string
  ): Promise<string>

  async rebindReport(
    reportId: string,
    workspaceId: string,
    datasetId: string
  ): Promise<void>
}
```

### 3. Database Provisioning Script
```typescript
// lib/database/provisioning.ts

async function provisionOrganizationDatabase(orgId: string) {
  // Option A: Create new Supabase project via API
  // Option B: Create new schema in existing project
  // Option C: Create new database in existing instance

  // Run migrations
  // Set up users/permissions
  // Return connection string
}
```

### 4. Automated Deployment Orchestrator
```typescript
// lib/deployment/orchestrator.ts

async function deployOrganization(orgId: string) {
  // 1. Provision database
  const dbConnection = await provisionOrganizationDatabase(orgId);

  // 2. Create PowerBI workspace
  const workspaceId = await powerbi.createWorkspace(org.name);

  // 3. Create dataset connected to their DB
  const datasetId = await powerbi.createDataset(workspaceId, dbConnection);

  // 4. Find matching reports
  const matching = await findMatchingReportsForOrganization(orgId);

  // 5. Clone and rebind each report
  for (const report of matching) {
    const newReportId = await powerbi.cloneReport(
      report.id,
      workspaceId,
      datasetId
    );

    // Save mapping
    await db.organization_powerbi_reports.insert({
      organization_id: orgId,
      template_report_id: report.id,
      powerbi_report_id: newReportId,
      powerbi_workspace_id: workspaceId,
      powerbi_dataset_id: datasetId
    });
  }
}
```

## Your Provider Code Matching Is PERFECT for This!

The system we built is EXACTLY what you need:

✅ **Templates**: 400 reports in your workspace with naming convention
✅ **Parsing**: Auto-extracts provider codes
✅ **Matching**: Finds 42 reports for APTEM+BKSB+HUBSPOT customer
✅ **Deployment Tracking**: Records which reports are in which workspace
✅ **Bulk Operations**: Clone all 42 reports at once

**We just need to add the PowerBI API integration layer!**

## Next Steps

Would you like me to build:

1. **PowerBI REST API Integration Module**
   - Service principal authentication
   - Workspace creation
   - Dataset creation
   - Report cloning and rebinding

2. **Database Provisioning System**
   - Choose your isolation model (project/schema/database)
   - Automated schema creation
   - Connection string management

3. **Deployment Orchestrator**
   - Automated end-to-end deployment
   - Connect database → workspace → dataset → reports
   - Error handling and rollback

4. **Update UI for Real Deployment**
   - "Deploy Reports" becomes "Clone Reports to Org Workspace"
   - Shows actual PowerBI API progress
   - Handles errors and retries

Which database isolation model do you want to use? That will determine the architecture I build.
