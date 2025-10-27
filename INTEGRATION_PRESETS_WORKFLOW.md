# Integration Presets Workflow

## Overview

The Skills Intelligence System supports multiple LMS and CRM providers with a sophisticated preset system that allows:
- Platform-wide default configurations
- Provider-specific combinations (Aptem, Bud, OneFile, Aptem+HubSpot, etc.)
- Tenant-specific overrides and customizations

## Architecture

### 1. Data Model

```
integration_providers (Individual systems)
  ├─ Aptem (LMS)
  ├─ Bud (LMS)
  ├─ OneFile (LMS)
  ├─ HubSpot (CRM)
  └─ Salesforce (CRM)

integration_presets (Combinations)
  ├─ Aptem Only
  ├─ Bud Only
  ├─ OneFile Only
  ├─ Aptem + HubSpot ⭐ Recommended
  ├─ Bud + Salesforce
  └─ Aptem + Salesforce

integration_preset_defaults (Platform-wide defaults for each preset)
  └─ Default configs, sync settings, field mappings

organizations
  ├─ Selected integration_preset_id
  └─ integration_config (overrides)

organization_integration_overrides (Tenant-specific customizations)
  └─ API credentials, custom mappings, sync settings
```

### 2. Complete Workflow

#### **Step 1: Super Admin Creates Organization**

1. Navigate to Super Admin Portal
2. Click "+ New Organization"
3. **Wizard Step 1 - Basic Information**:
   - Organization Name (e.g., "Acme Training Ltd")
   - Subdomain (e.g., "acme" → acme.aivii.co.uk)
   - Max Learners (optional cap)

4. **Wizard Step 2 - Integration Selection**:
   - Choose from presets:
     - **Aptem** (LMS only)
     - **Bud** (LMS only)
     - **OneFile** (LMS only)
     - **Aptem + HubSpot** ⭐ Recommended
     - **Bud + Salesforce**
     - **Aptem + Salesforce**

5. **Wizard Step 3 - Billing & Review**:
   - Billing contact information
   - Review all settings
   - Create organization

#### **Step 2: System Applies Default Configuration**

When an organization is created with a preset:

```sql
-- Organization record created with:
INSERT INTO organizations (
  name,
  subdomain,
  integration_preset_id,  -- e.g., "aptem_hubspot"
  ...
)
```

The system automatically applies:
- Default field mappings for that LMS
- Default sync frequency
- Default PowerBI filters for that provider
- Default role-to-report assignments

These defaults come from `integration_preset_defaults` table.

#### **Step 3: Super Admin Configures Provider-Specific Defaults** (Optional)

**Location**: Super Admin Portal → Integration Defaults Management

The Super Admin can configure platform-wide defaults for each preset:

```
Aptem + HubSpot Preset Configuration:
│
├─ Aptem Defaults
│  ├─ API URL: https://api.aptem.co.uk
│  ├─ Sync Frequency: Hourly
│  ├─ Field Mappings:
│  │  ├─ aptem.learner_id → learner.external_id
│  │  ├─ aptem.programme_name → learner.programme
│  │  └─ aptem.completion_date → learner.completion
│  └─ PowerBI Filters:
│     └─ LMS_Provider = "Aptem"
│
└─ HubSpot Defaults
   ├─ Sync Frequency: Daily
   ├─ Field Mappings:
   │  ├─ hubspot.contact_id → employer.crm_id
   │  └─ hubspot.company_name → employer.name
   └─ PowerBI Filters:
      └─ CRM_Provider = "HubSpot"
```

**Benefits**:
- All new "Aptem + HubSpot" organizations inherit these settings
- Changes to defaults affect future organizations only (existing ones unchanged)
- Consistent configuration across similar clients

#### **Step 4: Tenant-Specific Overrides**

After organization creation, Super Admin can override specific settings for that tenant:

**Location**: Super Admin Portal → Organizations → [Select Org] → Integration Settings

```
Acme Training Ltd - Integration Overrides:
│
├─ Aptem Override
│  ├─ API URL: https://api.aptem.co.uk (default)
│  ├─ API Key: [tenant-specific credential] 🔒
│  ├─ Sync Frequency: CUSTOM → Every 15 minutes
│  ├─ Field Mappings: CUSTOM
│  │  ├─ aptem.learner_id → learner.external_id (default)
│  │  └─ aptem.custom_field_123 → learner.division (custom)
│  └─ Enabled: ✓
│
└─ HubSpot Override
   ├─ Portal ID: [tenant-specific] 🔒
   ├─ API Key: [tenant-specific credential] 🔒
   ├─ Sync Frequency: Daily (default)
   ├─ Field Mappings: Using defaults
   └─ Enabled: ✓
```

**Key Points**:
- Each organization has its own API credentials (encrypted)
- Can override sync frequency, field mappings, filters
- Can disable specific integrations (e.g., keep Aptem, disable HubSpot)
- Overrides merge with defaults (only specify what's different)

#### **Step 5: Tenant Admin Management** (Future Feature)

Tenant Admins will have limited ability to customize:
- View integration status (connected/disconnected)
- Trigger manual syncs
- View sync logs
- **Cannot**:
  - Change API credentials (Super Admin only)
  - Modify field mappings (Super Admin only)
  - Change sync frequency (Super Admin only)

## Example Scenarios

### Scenario 1: Standard Aptem Client

1. Super Admin creates "ABC Training" organization
2. Selects "Aptem" preset
3. System applies Aptem defaults:
   - Field mappings: standard Aptem → database schema
   - Sync frequency: Hourly
   - PowerBI filters: LMS_Provider = "Aptem"
4. Super Admin adds Aptem API key for ABC Training
5. Integration syncs learner data hourly

### Scenario 2: Aptem + HubSpot Client with Custom Fields

1. Super Admin creates "XYZ Apprenticeships" organization
2. Selects "Aptem + HubSpot" preset
3. System applies defaults for both integrations
4. Super Admin adds custom field mappings:
   - Aptem custom field "division_code" → learner.division
   - HubSpot custom property "account_manager" → employer.account_manager
5. Super Admin sets Aptem sync to every 15 minutes (high volume client)
6. Both integrations sync with custom configuration

### Scenario 3: Migration from Bud to Aptem

1. Organization initially created with "Bud" preset
2. Super Admin changes `integration_preset_id` to "aptem"
3. System migrates to Aptem defaults
4. Super Admin updates API credentials
5. Old Bud sync stops, new Aptem sync begins
6. Data continues flowing with new provider

## Management Interfaces

### Super Admin Portal

**Integration Defaults Manager** `/super-admin/integration-defaults`:
```
┌─ Integration Presets ────────────────────────┐
│ Aptem                              [Edit]    │
│ Bud                                [Edit]    │
│ OneFile                            [Edit]    │
│ Aptem + HubSpot ⭐                  [Edit]    │
│ Bud + Salesforce                   [Edit]    │
│ Aptem + Salesforce                 [Edit]    │
└──────────────────────────────────────────────┘
```

**Organization Integration Manager** `/super-admin/organizations/[id]/integrations`:
```
┌─ Acme Training Ltd - Integrations ──────────┐
│                                              │
│ Preset: Aptem + HubSpot                     │
│                                              │
│ ┌─ Aptem ─────────────────────────┐         │
│ │ Status: Connected ✓              │         │
│ │ Last Sync: 2 minutes ago         │         │
│ │ API Key: **********************  │         │
│ │ Sync: Every 15 min (custom)      │         │
│ │                       [Configure] │         │
│ └──────────────────────────────────┘         │
│                                              │
│ ┌─ HubSpot ───────────────────────┐         │
│ │ Status: Connected ✓              │         │
│ │ Last Sync: 3 hours ago           │         │
│ │ Portal ID: **********            │         │
│ │ Sync: Daily (default)            │         │
│ │                       [Configure] │         │
│ └──────────────────────────────────┘         │
└──────────────────────────────────────────────┘
```

## Security

- API credentials stored in `organization_integration_overrides.api_credentials` (JSONB)
- **Should be encrypted at rest** (future enhancement: use Supabase Vault or AWS Secrets Manager)
- Only Super Admins can view/edit credentials
- Tenant Admins cannot access credentials
- Row Level Security (RLS) enforces access control

## Sync Process

```
┌─────────────────────────────────────────────────┐
│         Integration Sync Flow                   │
└─────────────────────────────────────────────────┘

1. Scheduler triggers sync for Organization X
   ↓
2. Load organization's integration preset
   ↓
3. Load default configuration for preset
   ↓
4. Merge with organization-specific overrides
   ↓
5. For each provider in preset:
   ├─ Connect using organization's API credentials
   ├─ Fetch data using provider's API
   ├─ Transform using field mappings
   ├─ Apply PowerBI filters
   └─ Insert/update database records
   ↓
6. Log sync results to integration_sync_logs
```

## Benefits of This Architecture

1. **Scalability**: Add new providers without changing code
2. **Consistency**: Default configurations ensure best practices
3. **Flexibility**: Per-tenant overrides for special cases
4. **Maintainability**: Centralized defaults, easy to update
5. **Auditability**: Full sync history and configuration tracking
6. **Multi-Tenancy**: Each organization completely isolated
7. **Provider Agnostic**: System doesn't care which LMS/CRM is used

## Future Enhancements

1. **Integration Marketplace**: Allow tenants to request new integrations
2. **Self-Service Configuration**: Let Tenant Admins configure basic settings
3. **Integration Templates**: Import/export configurations between organizations
4. **Webhooks**: Real-time sync instead of polling
5. **Data Validation**: Automatic quality checks on imported data
6. **Transformation Rules Engine**: Visual interface for field mappings
7. **Credential Rotation**: Automatic API key rotation for security
