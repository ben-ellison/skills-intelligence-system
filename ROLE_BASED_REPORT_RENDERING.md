# Role-Based Dynamic Report Rendering

## The Feature (From Current Platform)

**Smart Tab Behavior:**
- Same tab name shows different content based on user's role
- Operations Leader sees "Operations Leader" content
- Operations Manager sees "Operations Manager" content
- Users with multiple roles see multiple tabs (one per role)
- Prevents duplicate messy navigation

## Current System Example

```
Module: "Operations Leader" (in navigation sidebar)

Tab: "Operations Leader Dashboard"
├── If user.role = "Operations Leader"
│   └── Show: "Operations Leader V1.0 Release" > "Operations Leader Dashboard" page
│
├── If user.role = "Operations Manager"
│   └── Show: "Operations Manager V1.0 Release" > "Operations Manager Detail" page
│
└── If user has BOTH roles
    ├── Tab 1: "Operations Leader Dashboard" (Operations Leader content)
    └── Tab 2: "Operations Manager Dashboard" (Operations Manager content)
```

## Database Schema Design

### Option 1: Role-Specific Module Features (Recommended)

```sql
-- Link features to roles explicitly
CREATE TABLE role_module_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  organization_module_id UUID REFERENCES organization_modules(id) ON DELETE CASCADE,
  organization_report_id UUID REFERENCES organization_powerbi_reports(id) ON DELETE CASCADE,

  -- What to show
  page_name_or_id TEXT NOT NULL, -- PowerBI page name/ID
  tab_name TEXT, -- Tab label (can be same for different roles)
  display_name TEXT,

  -- Ordering (within this role's view)
  sort_order INTEGER DEFAULT 0,

  -- Config
  report_filter JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique page per role per module
  UNIQUE(role_id, organization_module_id, page_name_or_id)
);

CREATE INDEX idx_role_features_role ON role_module_features(role_id);
CREATE INDEX idx_role_features_module ON role_module_features(organization_module_id);
CREATE INDEX idx_role_features_report ON role_module_features(organization_report_id);
```

### How It Works:

**Admin Configuration:**
```
Organization: Demo1
Module: "Operations Leader"

Role: Operations Leader
├── Feature: "Operations Leader Dashboard"
│   ├── Report: "Operations Leader V1.0 Release"
│   ├── Page: "Operations Leader Dashboard"
│   └── Tab Name: "Dashboard"

Role: Operations Manager
├── Feature: "Operations Manager Dashboard"
│   ├── Report: "Operations Manager V1.0 Release"
│   ├── Page: "Operations Manager Detail"
│   └── Tab Name: "Dashboard" (same tab name!)

Role: Senior Leader
├── Feature: "Senior Leader Overview"
│   ├── Report: "Senior Leader V1.0 Release"
│   ├── Page: "Senior Leader Dashboard"
│   └── Tab Name: "Overview"
```

**User Experience:**

```javascript
// Get features for current user
function getUserModuleFeatures(userId, moduleId) {
  // Get user's roles
  const userRoles = await db.query(`
    SELECT role_id FROM users WHERE id = $1
  `, [userId]);

  // Get features for those roles
  const features = await db.query(`
    SELECT
      rmf.*,
      opr.powerbi_report_id,
      opr.powerbi_workspace_id,
      pr.name as report_name
    FROM role_module_features rmf
    JOIN organization_powerbi_reports opr ON opr.id = rmf.organization_report_id
    JOIN powerbi_reports pr ON pr.id = opr.template_report_id
    WHERE rmf.role_id = ANY($1)
      AND rmf.organization_module_id = $2
      AND rmf.is_active = true
    ORDER BY rmf.sort_order
  `, [userRoles.map(r => r.role_id), moduleId]);

  return features;
}

// User with role "Operations Leader" sees:
[
  {
    tab_name: "Dashboard",
    report_id: "ops-leader-report-id",
    page: "Operations Leader Dashboard"
  }
]

// User with role "Operations Manager" sees:
[
  {
    tab_name: "Dashboard",
    report_id: "ops-manager-report-id",
    page: "Operations Manager Detail"
  }
]

// User with BOTH roles sees:
[
  {
    tab_name: "Leader Dashboard",
    report_id: "ops-leader-report-id",
    page: "Operations Leader Dashboard"
  },
  {
    tab_name: "Manager Dashboard",
    report_id: "ops-manager-report-id",
    page: "Operations Manager Detail"
  }
]
```

## UI Rendering

```typescript
// User-facing platform
export default function ModulePage({ module, user }) {
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    // Fetch features based on user's roles
    async function loadFeatures() {
      const response = await fetch(
        `/api/modules/${module.id}/features?userId=${user.id}`
      );
      const data = await response.json();
      setFeatures(data.features);
    }
    loadFeatures();
  }, [module.id, user.id]);

  return (
    <div>
      {/* Top navigation tabs */}
      <Tabs>
        {features.map(feature => (
          <Tab key={feature.id} name={feature.tab_name}>
            {/* Embed PowerBI report */}
            <PowerBIEmbed
              reportId={feature.powerbi_report_id}
              workspaceId={feature.powerbi_workspace_id}
              pageName={feature.page_name_or_id}
            />
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
```

## Admin Configuration UI

```typescript
// Super Admin configures which roles see which reports
export default function ModuleRoleConfiguration({ organization, module }) {
  return (
    <div>
      <h2>Configure "{module.name}" for {organization.name}</h2>

      {/* For each role in the organization */}
      {roles.map(role => (
        <RoleFeatureEditor
          key={role.id}
          role={role}
          module={module}
          organization={organization}
        />
      ))}
    </div>
  );
}

function RoleFeatureEditor({ role, module, organization }) {
  return (
    <Card>
      <h3>Role: {role.name}</h3>

      {/* Add features for this role */}
      <Button onClick={addFeature}>+ Add Feature</Button>

      {/* List current features */}
      {roleFeatures.map(feature => (
        <FeatureRow key={feature.id}>
          <Select
            label="Report"
            value={feature.organization_report_id}
            options={availableReports}
          />

          <Input
            label="Page Name"
            value={feature.page_name_or_id}
          />

          <Input
            label="Tab Name"
            value={feature.tab_name}
          />

          <Button onClick={() => deleteFeature(feature.id)}>
            Remove
          </Button>
        </FeatureRow>
      ))}
    </Card>
  );
}
```

## Migration Strategy

### For Your Current Demo:

**Step 1: Create role-based mappings**
```sql
-- Add role-based feature mappings
INSERT INTO role_module_features (
  role_id,
  organization_module_id,
  organization_report_id,
  page_name_or_id,
  tab_name,
  sort_order
)
SELECT
  -- Operations Leader role
  (SELECT id FROM roles WHERE name = 'Operations Leader'),
  om.id,
  opr.id,
  'Operations Leader Dashboard',
  'Dashboard',
  1
FROM organization_modules om
JOIN organization_powerbi_reports opr ON opr.organization_id = om.organization_id
JOIN powerbi_reports pr ON pr.id = opr.template_report_id
WHERE om.name = 'Operations Leader'
  AND pr.name LIKE '%Operations Leader%';

-- Operations Manager role
INSERT INTO role_module_features (
  role_id,
  organization_module_id,
  organization_report_id,
  page_name_or_id,
  tab_name,
  sort_order
)
SELECT
  (SELECT id FROM roles WHERE name = 'Operations Manager'),
  om.id,
  opr.id,
  'Operations Manager Detail',
  'Dashboard',
  1
FROM organization_modules om
JOIN organization_powerbi_reports opr ON opr.organization_id = om.organization_id
JOIN powerbi_reports pr ON pr.id = opr.template_report_id
WHERE om.name = 'Operations Leader'
  AND pr.name LIKE '%Operations Manager%';
```

**Step 2: User sees role-specific content**
```
When user logs in:
├── System checks: user.role_id
├── Loads: role_module_features WHERE role_id = user.role_id
└── Shows: Only reports/pages for their role
```

## Benefits

✅ **Cleaner navigation** - No duplicate tabs
✅ **Role-specific content** - Each role sees only their reports
✅ **Flexible configuration** - Different orgs can configure differently
✅ **Multi-role support** - Users with multiple roles see multiple tabs
✅ **Per-tenant customization** - Each org can map roles differently

## Example Configuration

```
Demo1 Organization:

Module: "Operations Leader"
├── Role: Operations Leader
│   └── Shows: "Operations Leader V1.0 Release" > "Dashboard" page
├── Role: Operations Manager
│   └── Shows: "Operations Manager V1.0 Release" > "Detail" page
└── Role: Senior Leader
    └── Shows: "Senior Leader V1.0 Release" > "Overview" page

Module: "Quality Leader"
├── Role: Quality Leader
│   └── Shows: "Quality Leader V1.0 Release" > "Dashboard" page
└── Role: Quality Manager
    └── Shows: "Quality Manager V1.0 Release" > "Manager View" page
```

This preserves your current smart role-based rendering while adding per-tenant flexibility!
