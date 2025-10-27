# Automated Multi-Tenant Deployment Architecture

## ✅ YES, THIS IS 100% POSSIBLE!

Your ideal workflow is completely achievable using Microsoft APIs. Here's the technical implementation:

---

## The Complete Automated Flow

### Step 1: Super Admin Adds Organization

**Super Admin Portal Form:**
```typescript
interface OrganizationOnboarding {
  // Basic Info
  name: string;                    // "Acme Training"
  subdomain: string;                // "acme"

  // Provider Selection
  lmsProvider: string;              // "APTEM"
  englishMathsProvider: string;     // "BKSB"
  crmProvider: string;              // "HUBSPOT"
  hrProvider?: string;              // Optional

  // Fabric Connection
  fabricWorkspaceUrl: string;       // Their data source
  fabricConnectionString: string;   // Encrypted connection details

  // Platform Super Users
  superUsers: Array<{
    email: string;
    firstName: string;
    lastName: string;
  }>;

  // GoDaddy (if applicable)
  goDaddyDomain?: string;          // e.g., "yourplatform.com"
}
```

**What Happens:**
- Form validates all inputs
- Finds matching reports (APTEM-BKSB-HUBSPOT = 42 reports)
- Shows preview: "Will deploy 42 reports"
- Click "Start Deployment"

---

### Step 2: Automated Orchestration

The system runs a **deployment pipeline** that executes these steps in order:

#### 2.1 GoDaddy Subdomain Creation
```javascript
// Using GoDaddy API
POST https://api.godaddy.com/v1/domains/{yourplatform.com}/records/A/@

Headers:
  Authorization: sso-key {api-key}:{api-secret}

Body:
[{
  "type": "CNAME",
  "name": "acme",
  "data": "your-vercel-app.vercel.app",
  "ttl": 3600
}]

// Creates: acme.yourplatform.com → Points to your Next.js app
```

**Result:** `acme.yourplatform.com` is live and routes to your platform

---

#### 2.2 Fabric Workspace Creation

**Option A: Clone Existing Workspace (Recommended)**
```javascript
// Microsoft Fabric REST API
POST https://api.fabric.microsoft.com/v1/workspaces

Headers:
  Authorization: Bearer {access_token}

Body:
{
  "displayName": "Acme Training Workspace",
  "description": "Data workspace for Acme Training",
  "capacityId": "{your-fabric-capacity-id}"
}

// Returns: workspaceId
```

**Option B: Use Lakehouse/Warehouse Template**
```javascript
// If you have a template lakehouse schema:
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses

Body:
{
  "displayName": "Acme Lakehouse",
  "schema": {
    // Clone from template schema
  }
}
```

**Option C: Azure Synapse/SQL Database (If not using Fabric native)**
```javascript
// If using Azure SQL for each tenant:
POST https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.Sql/servers/{server}/databases/{acme_training}

// Creates isolated database for Acme
```

**What to do with their data:**
- If they're bringing data via API, you just set up the schema
- If you're ingesting data for them, set up data pipelines
- Connection string is stored encrypted in Supabase

**Result:** Fabric workspace created, schema ready, connection string available

---

#### 2.3 PowerBI Workspace Creation

```javascript
// PowerBI REST API
POST https://api.powerbi.com/v1.0/myorg/groups

Headers:
  Authorization: Bearer {powerbi_access_token}

Body:
{
  "name": "Acme Training Workspace"
}

// Returns: { id: "workspace-guid" }
```

**Result:** Empty PowerBI workspace created for Acme

---

#### 2.4 Create Dataset in Their Workspace

```javascript
// Clone your template dataset structure
POST https://api.powerbi.com/v1.0/myorg/groups/{acmeWorkspaceId}/datasets

Body:
{
  "name": "Acme Main Dataset",
  "tables": [
    // Copy table structure from template
    {
      "name": "Learners",
      "columns": [...],
      "measures": [...]
    },
    {
      "name": "Apprenticeships",
      "columns": [...],
      "measures": [...]
    }
    // ... all tables
  ],
  "relationships": [
    // Copy relationships from template
  ]
}

// Returns: { id: "dataset-guid" }
```

**Then bind to Acme's Fabric workspace:**
```javascript
PATCH https://api.powerbi.com/v1.0/myorg/groups/{acmeWorkspaceId}/datasets/{datasetId}/Default.UpdateDatasources

Body:
{
  "updateDetails": [{
    "datasourceSelector": {
      "datasourceType": "AnalysisServices", // Fabric uses this
      "connectionDetails": {
        "server": "api.fabric.microsoft.com",
        "database": "{acme-fabric-workspace-id}"
      }
    },
    "connectionDetails": {
      "server": "api.fabric.microsoft.com",
      "database": "{acme-fabric-workspace-id}"
    },
    "credentialDetails": {
      "credentialType": "OAuth2",
      "encryptedConnection": "Encrypted",
      "encryptionAlgorithm": "RSA-OAEP",
      "privacyLevel": "Organizational"
    }
  }]
}
```

**Result:** Dataset in Acme's workspace, connected to Acme's Fabric workspace

---

#### 2.5 Clone & Deploy Reports

**For each of the 42 matching reports:**

```javascript
// Provider matching already found: APTEM-BKSB-HUBSPOT = 42 reports

for (const templateReport of matchingReports) {
  // 1. Clone report from template workspace to Acme workspace
  const cloneResult = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${acmeWorkspaceId}/imports`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${powerbiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nameConflict: 'CreateOrOverwrite',
        skipReport: false
      })
    }
  );

  // Upload PBIX file via multipart/form-data
  const formData = new FormData();
  formData.append('file', await getReportPBIX(templateReport.id));

  const uploadResult = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${acmeWorkspaceId}/imports?datasetDisplayName=Acme Main Dataset`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${powerbiToken}`
      },
      body: formData
    }
  );

  const importId = uploadResult.id;

  // 2. Wait for import to complete
  let importStatus;
  do {
    await sleep(2000);
    importStatus = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${acmeWorkspaceId}/imports/${importId}`,
      {
        headers: { 'Authorization': `Bearer ${powerbiToken}` }
      }
    ).then(r => r.json());
  } while (importStatus.importState === 'Publishing');

  if (importStatus.importState !== 'Succeeded') {
    throw new Error(`Failed to import report: ${templateReport.name}`);
  }

  const newReportId = importStatus.reports[0].id;

  // 3. Rebind report to Acme's dataset
  await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${acmeWorkspaceId}/reports/${newReportId}/Rebind`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${powerbiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        datasetId: acmeDatasetId
      })
    }
  );

  // 4. Save mapping to database
  await db.organization_powerbi_reports.insert({
    organization_id: acmeOrgId,
    template_report_id: templateReport.id,
    powerbi_report_id: newReportId,
    powerbi_workspace_id: acmeWorkspaceId,
    powerbi_dataset_id: acmeDatasetId,
    deployment_status: 'active'
  });

  console.log(`✅ Deployed: ${templateReport.name}`);
}
```

**Result:** All 42 reports deployed to Acme's workspace, connected to Acme's dataset/Fabric

---

#### 2.6 Initialize Module Configuration

```javascript
// Copy global module templates to Acme's configuration
await db.query(`
  SELECT initialize_organization_modules('${acmeOrgId}')
`);

// Auto-link deployed reports to module features
await db.query(`
  SELECT link_deployed_reports_to_features('${acmeOrgId}')
`);
```

**Result:** Acme has complete module configuration, ready to customize

---

#### 2.7 Create Platform Super Users

```javascript
// Create user accounts in Supabase Auth
for (const superUser of formData.superUsers) {
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: superUser.email,
    email_confirm: true,
    user_metadata: {
      first_name: superUser.firstName,
      last_name: superUser.lastName
    }
  });

  // Create user record in database
  await db.users.insert({
    auth0_user_id: authUser.id, // or auth provider ID
    organization_id: acmeOrgId,
    email: superUser.email,
    first_name: superUser.firstName,
    last_name: superUser.lastName,
    role_id: superAdminRoleId,
    is_active: true
  });

  // Send welcome email
  await sendWelcomeEmail(superUser.email, {
    organizationName: 'Acme Training',
    loginUrl: `https://acme.yourplatform.com`,
    temporaryPassword: generateTempPassword()
  });
}
```

**Result:** Super users created, welcome emails sent

---

#### 2.8 Update Organization Record

```javascript
await db.organizations.update({
  where: { id: acmeOrgId },
  data: {
    subdomain: 'acme',
    powerbi_workspace_id: acmeWorkspaceId,
    powerbi_workspace_name: 'Acme Training Workspace',
    fabric_workspace_id: acmeFabricWorkspaceId,
    fabric_connection_string: encryptedConnectionString,
    deployment_status: 'pending_qa', // Not live yet!
    deployed_at: new Date()
  }
});
```

**Result:** Organization fully configured, ready for QA

---

### Step 3: Manual QA Check

**QA Dashboard shows:**
```
Organization: Acme Training
Subdomain: acme.yourplatform.com ✅
Fabric Workspace: Created ✅
PowerBI Workspace: Created ✅
Dataset: Connected to Fabric ✅
Reports Deployed: 42/42 ✅
Module Config: Initialized ✅
Super Users: 3 created ✅

Status: PENDING QA

Actions:
[View Reports in PowerBI] [Test Login] [Approve & Go Live] [Rollback]
```

**You manually:**
1. Open PowerBI workspace
2. Check a few reports load data correctly
3. Test login as super user
4. Verify subdomain works
5. Click "Approve & Go Live"

---

### Step 4: Go Live

```javascript
await db.organizations.update({
  where: { id: acmeOrgId },
  data: {
    deployment_status: 'active',
    activated_at: new Date()
  }
});

// Send notification to super users
await sendEmail(superUsers, {
  subject: 'Your platform is ready!',
  body: `
    Your Skills Intelligence platform is now live!

    Access it at: https://acme.yourplatform.com

    Login with the credentials we sent you.
  `
});
```

**Result:** Acme users can log in and use the platform! 🎉

---

## Your Question #4: Supabase Architecture

> Do we need separate Supabase DB for each tenant?

**NO! You only need ONE Supabase database for the entire platform.**

**What Supabase stores (for ALL tenants):**
```
Supabase Database (Shared):
├── users (all platform users)
├── organizations (all client organizations)
├── organization_modules (per-tenant module configs)
├── organization_powerbi_reports (deployment mappings)
├── roles
├── subscriptions
└── Application configuration
    └── NO CUSTOMER DATA!

Customer Data Lives In:
├── Fabric Workspace (isolated per customer)
└── PowerBI connects to Fabric
```

**Why this works:**
- ✅ Customer data is in Fabric (fully isolated)
- ✅ Application config is in Supabase (with RLS on organization_id)
- ✅ PowerBI reports connect to customer's Fabric workspace
- ✅ No risk of data leakage (data never goes through Supabase)
- ✅ Much easier to manage (one database to maintain)

**Row Level Security in Supabase ensures:**
```sql
-- Users can only see their organization's data
CREATE POLICY "org_isolation" ON users
  FOR SELECT
  USING (organization_id = auth.jwt() ->> 'organization_id');

-- But customer data is never here anyway!
```

---

## Technical Requirements

To build this automated system, you need:

### 1. Microsoft Fabric API Access
- Service Principal with Fabric Admin permissions
- Capacity ID where workspaces will be created

### 2. PowerBI Embedded License
- You mentioned you have this ✅
- Service Principal with PowerBI API permissions

### 3. GoDaddy API Access
- API Key & Secret from GoDaddy
- Domain already registered

### 4. Template Assets
- Template Fabric workspace/schema
- Template PowerBI dataset (.pbix or API-defined)
- 400 template reports as .pbix files

### 5. Secrets Management
- Azure Key Vault (recommended) or
- Environment variables (encrypted)

---

## What I'll Build Next

I can create:

### 1. **Deployment Orchestrator** (`lib/deployment/orchestrator.ts`)
- Runs entire automated flow
- Handles errors & rollbacks
- Progress tracking
- Logs everything

### 2. **PowerBI Deployment Module** (`lib/powerbi/deployment.ts`)
- Workspace creation
- Dataset creation & binding
- Report cloning & rebinding
- Automated rebinding to customer's Fabric

### 3. **Fabric Integration Module** (`lib/fabric/provisioning.ts`)
- Workspace creation
- Schema cloning
- Connection string management

### 4. **GoDaddy Integration** (`lib/infrastructure/godaddy.ts`)
- Subdomain creation
- DNS management

### 5. **Super Admin Onboarding UI**
- Multi-step wizard
- Provider selection (finds matching reports)
- Progress dashboard
- QA approval interface

### 6. **Deployment Status Dashboard**
- Real-time progress
- Error reporting
- Manual QA checklist
- Approve/Rollback controls

---

## Next Steps

Should I start building:

1. ✅ **Migration 010** (per-tenant module config) - Already created
2. ✅ **Deployment orchestrator** - The brain of the operation
3. ✅ **PowerBI deployment module** - Automates report deployment
4. ✅ **Onboarding UI** - Super admin wizard

**Which component do you want me to build first?**

Or should I build them all in order? It'll take some time but I can create the complete automated deployment system.

Let me know and I'll start coding! 🚀
