# Modular Report Composition System

## The Problem

Currently, common pages (Learner Dashboard, Learning Plan Overview, etc.) are **duplicated across 20+ reports**.

**Maintenance nightmare:**
- Update "Learner Dashboard" → Must edit in 20+ places
- Deploy new version → Must update 20+ reports
- Fix a bug → Must fix in 20+ reports

## The Solution: Shared Report Modules

Break reports into **composable modules**:

### 1. Core Reports (Shared Across All Roles)
```
Report: "Core Dashboards V1.0"
├── Learner Dashboard
├── Learning Plan Overview
├── Employer Dashboard
└── Learner Drill Through

Used by: EVERYONE
Update once → Affects all roles ✅
```

### 2. Role-Specific Reports
```
Report: "Skills Coach V1.0"
├── Skills Coach Dashboard
└── Skills Coach LP Activities

Report: "Operations Manager V1.0"
└── Operations Manager Detail

Report: "Operations Leader V1.0"
└── Operations Leader Dashboard

Report: "Quality Leader V1.0"
└── Quality Leader Dashboard
```

### 3. Division-Specific Reports (Optional)
```
Report: "Operations Shared V1.0"
├── OTJH Progress
└── Funding Status

Report: "Quality Shared V1.0"
├── Quality Metrics
└── Review Status
```

---

## How Users See It

### Skills Coach User Sees These Tabs:
```
[Skills Coach Dashboard] [Skills Coach LP] [Learner] [Learning Plan] [Employer] [Drill Through]
     ↓                         ↓                ↓           ↓             ↓            ↓
Skills Coach Report      Skills Coach     Core Report  Core Report   Core Report  Core Report
```

### Operations Leader Sees These Tabs:
```
[Ops Leader Dashboard] [Ops Manager] [Skills Coach] [Learner] [Learning Plan] ...
        ↓                    ↓              ↓            ↓
Ops Leader Report    Ops Manager Report  Skills Coach  Core Report
```

**Key:** Each tab comes from a different report, but they're seamlessly combined in the UI!

---

## Database Schema

### Current (What You Have):
```sql
module_features:
├── module_id (Skills Coach)
├── pbi_report (Skills Coach V1.0 Release)
├── page_name_or_id (Skills Coach Dashboard)
└── Locked to ONE report per module ❌
```

### New (Composable):
```sql
role_module_features:
├── role_id (Skills Coach)
├── organization_module_id (Operations)
├── organization_report_id (Skills Coach V1.0) ← Can be DIFFERENT per tab!
├── page_name_or_id (Skills Coach Dashboard)
└── Multiple reports per role ✅

-- Example for Skills Coach:
INSERT INTO role_module_features VALUES
  -- Role-specific pages
  (skills_coach_role, operations_module, 'Skills Coach V1.0 Report', 'Skills Coach Dashboard', 1),
  (skills_coach_role, operations_module, 'Skills Coach V1.0 Report', 'Skills Coach LP Activities', 2),

  -- Shared pages from Core Reports
  (skills_coach_role, operations_module, 'Core Dashboards V1.0 Report', 'Learner Dashboard', 3),
  (skills_coach_role, operations_module, 'Core Dashboards V1.0 Report', 'Learning Plan Overview', 4),
  (skills_coach_role, operations_module, 'Core Dashboards V1.0 Report', 'Employer Dashboard', 5),
  (skills_coach_role, operations_module, 'Core Dashboards V1.0 Report', 'Learner Drill Through', 6);
```

---

## Rendering Logic

### Frontend (User-Facing Platform):
```typescript
function ModulePage({ user, module }) {
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    // Fetch all features for user's role in this module
    const features = await db.query(`
      SELECT
        rmf.id,
        rmf.page_name_or_id,
        rmf.tab_name,
        opr.powerbi_report_id,
        opr.powerbi_workspace_id,
        rmf.sort_order
      FROM role_module_features rmf
      JOIN organization_powerbi_reports opr ON opr.id = rmf.organization_report_id
      WHERE rmf.role_id = $1
        AND rmf.organization_module_id = $2
      ORDER BY rmf.sort_order
    `, [user.role_id, module.id]);

    setTabs(features);
  }, [user, module]);

  return (
    <Tabs>
      {tabs.map(tab => (
        <Tab key={tab.id} label={tab.tab_name}>
          <PowerBIEmbed
            reportId={tab.powerbi_report_id} // ← Different per tab!
            workspaceId={tab.powerbi_workspace_id}
            pageName={tab.page_name_or_id}
          />
        </Tab>
      ))}
    </Tabs>
  );
}
```

**Key Difference:**
- Old: All tabs from ONE report
- New: Each tab can be from a DIFFERENT report

---

## Admin Configuration UI

### Global Template Configuration:
```
Role: Skills Coach

Add Features:
[+ Add Feature]

Feature 1:
├── Report: [Dropdown: Skills Coach V1.0]
├── Page: [Dropdown: Skills Coach Dashboard]
├── Tab Name: "Dashboard"
└── Order: 1

Feature 2:
├── Report: [Dropdown: Skills Coach V1.0]
├── Page: [Dropdown: Skills Coach LP Activities]
├── Tab Name: "LP Activities"
└── Order: 2

Feature 3:
├── Report: [Dropdown: Core Dashboards V1.0] ← Different report!
├── Page: [Dropdown: Learner Dashboard]
├── Tab Name: "Learner"
└── Order: 3

Feature 4:
├── Report: [Dropdown: Core Dashboards V1.0] ← Same shared report
├── Page: [Dropdown: Learning Plan Overview]
├── Tab Name: "Learning Plan"
└── Order: 4
```

### Per-Tenant Override:
```
Organization: Demo1
Role: Skills Coach

Inherits from global template:
✅ Skills Coach Dashboard (Skills Coach V1.0)
✅ Skills Coach LP Activities (Skills Coach V1.0)
✅ Learner Dashboard (Core Dashboards V1.0)
✅ Learning Plan Overview (Core Dashboards V1.0)

Override Feature #3:
├── Report: [Dropdown: Custom Demo1 Learner Dashboard]
├── Page: [Dropdown: Demo1 Custom View]
└── Only affects Demo1 organization ✅
```

---

## Deployment Strategy

### Report Categorization:
```
PowerBI Reports:
├── Type: "Core" (shared by everyone)
│   └── Core Dashboards V1.0
│
├── Type: "Role-Specific"
│   ├── Skills Coach V1.0
│   ├── Operations Leader V1.0
│   ├── Operations Manager V1.0
│   └── ...
│
└── Type: "Division-Specific"
    ├── Operations Shared V1.0
    ├── Quality Shared V1.0
    └── ...
```

### When Deploying to New Customer:
```
Deploy to Acme Training:

1. Core Reports → Deploy once
   ✅ Core Dashboards V1.0 (used by ALL roles)

2. Role-Specific Reports → Deploy based on roles they use
   ✅ Skills Coach V1.0 (they have Skills Coaches)
   ✅ Operations Leader V1.0 (they have Ops Leaders)
   ✅ Operations Manager V1.0 (they have Ops Managers)
   ❌ Sales Leader V1.0 (they don't have sales team - skip!)

3. Division-Specific Reports → Deploy based on divisions
   ✅ Operations Shared V1.0
   ✅ Quality Shared V1.0
   ❌ Sales Shared V1.0 (no sales division - skip!)

Result: Deploy ~10 reports instead of 20+
```

---

## Benefits

### ✅ Maintenance:
```
Update "Learner Dashboard"?
Old: Edit 20+ reports
New: Edit "Core Dashboards V1.0" once ✅
```

### ✅ Deployment:
```
Deploy to new customer?
Old: Deploy all 20+ reports
New: Deploy only reports they need (Core + their roles) ✅
```

### ✅ Flexibility:
```
Customer wants custom "Learner Dashboard"?
Old: Create entire custom report with all pages
New: Just override ONE feature to point to custom report ✅
```

### ✅ Updates:
```
Push update to all customers?
Old: Update 20+ reports per customer
New: Update "Core Dashboards V1.0" template → Redeploy once ✅
```

---

## Migration From Current System

### Step 1: Identify Shared Pages
```
Analyze current reports:
├── "Learner Dashboard" appears in 15 reports → Move to Core
├── "Learning Plan Overview" appears in 12 reports → Move to Core
├── "Employer Dashboard" appears in 10 reports → Move to Core
└── "Operations Leader Dashboard" appears in 1 report → Keep in role-specific
```

### Step 2: Create Core Reports
```
New Report: "Core Dashboards V1.0"
├── Copy "Learner Dashboard" page (from any report - they're the same)
├── Copy "Learning Plan Overview" page
├── Copy "Employer Dashboard" page
└── Deploy to template workspace
```

### Step 3: Create Role-Specific Reports
```
New Report: "Skills Coach V1.0"
├── Copy ONLY Skills Coach-specific pages
└── Remove shared pages (now in Core)

New Report: "Operations Leader V1.0"
├── Copy ONLY Ops Leader-specific pages
└── Remove shared pages
```

### Step 4: Reconfigure Features
```
Update role_module_features:

Old:
├── Skills Coach → "Skills Coach V1.0 Release" → All pages

New:
├── Skills Coach → "Skills Coach V1.0" → Skills Coach pages
└── Skills Coach → "Core Dashboards V1.0" → Shared pages
```

---

## Implementation Checklist

- [ ] Add `report_type` column to powerbi_reports ('core', 'role_specific', 'division_specific', 'custom')
- [ ] Allow multiple reports per role in role_module_features
- [ ] Update admin UI to select report per feature (not per module)
- [ ] Build Core Reports template
- [ ] Migrate existing reports to modular structure
- [ ] Test multi-report tab rendering
- [ ] Add per-tenant override capability
- [ ] Deploy and verify maintenance improvements

---

This is the real solution to your maintenance nightmare! 🎯
