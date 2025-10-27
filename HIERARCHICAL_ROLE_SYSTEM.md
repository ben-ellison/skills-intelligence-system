# Hierarchical Role-Based Access System

## Role Seniority Levels

### Level 1: Senior Leader (Omniscient)
- **Sees:** Everything across all divisions
- **Module Access:** ALL modules (including Senior Leader exclusive module)
- **View Type:** Leader view for every division
- **Tab Access:** ALL tabs in every module (left to right)

**Navigation:**
```
├── 🏠 Home
├── 👥 Senior Leader ← Exclusive to Senior Leader
├── ⚙️ Operations (as Operations Leader)
│   ├── Operations Leader Dashboard
│   ├── Operations Manager Detail
│   ├── Skills Coach Dashboard
│   ├── Skills Coach LP Activities
│   ├── Learner Dashboard
│   ├── Learning Plan Overview
│   ├── Employer Dashboard
│   └── Learner Drill Through
├── ✅ Quality (as Quality Leader)
│   └── All Quality tabs...
├── 💼 Sales (as Sales Leader)
│   └── All Sales tabs...
├── 📋 Compliance (as Compliance Leader)
└── ... (all other modules)
```

---

### Level 2: Division Leader (Operations Leader, Quality Leader, etc.)
- **Sees:** All divisions as if they were that division's leader
- **Module Access:** ALL modules EXCEPT Senior Leader
- **View Type:** Leader view for every division
- **Tab Access:** ALL tabs within each module

**Example: Operations Leader**
```
├── 🏠 Home
├── ⚙️ Operations (their division - leader view)
│   ├── Operations Leader Dashboard ✅
│   ├── Operations Manager Detail ✅
│   ├── Skills Coach Dashboard ✅
│   └── ... (all tabs)
├── ✅ Quality (as Quality Leader)
│   ├── Quality Leader Dashboard ✅
│   ├── Quality Manager Dashboard ✅
│   └── ... (all tabs)
├── 💼 Sales (as Sales Leader)
│   └── All Sales tabs...
└── 📋 Compliance (as Compliance Leader)

CANNOT see:
❌ Senior Leader module
```

**Key Insight:**
A Division Leader can see OTHER divisions at the LEADER level.
- Operations Leader sees Quality LEADER dashboard
- Quality Leader sees Operations LEADER dashboard
- They're peers with cross-division visibility

---

### Level 3: Division Manager (Operations Manager, Quality Manager, etc.)
- **Sees:** ONLY their own division
- **Module Access:** ONLY their division module + generic modules
- **View Type:** Manager view (not Leader view)
- **Tab Access:** Starting from MANAGER tab onwards (not leader tabs)

**Example: Operations Manager**
```
├── 🏠 Home
├── ⚙️ Operations (ONLY their division)
│   ├── Operations Leader Dashboard ❌ (too senior)
│   ├── Operations Manager Detail ✅ (starts here)
│   ├── Skills Coach Dashboard ✅
│   ├── Skills Coach LP Activities ✅
│   └── ... (tabs from Manager →)
├── 📊 AAF (generic - if permitted)
├── 📋 QAR Scenarios (generic - if permitted)
└── 💰 Funding Info (generic - if permitted)

CANNOT see:
❌ Senior Leader module
❌ Quality module
❌ Sales module
❌ Operations Leader tab (above their level)
```

**Key Insight:**
Managers are siloed to their division and start seeing tabs from THEIR level down.

---

### Level 4: User/Practitioner (Skills Coach, Salesperson, IQA, etc.)
- **Sees:** ONLY their own division
- **Module Access:** ONLY their division module + generic modules
- **View Type:** User-specific dashboards
- **Tab Access:** Starting from THEIR ROLE tab onwards (not leader/manager tabs)

**Example: Skills Coach**
```
├── 🏠 Home
├── ⚙️ Operations (ONLY their division)
│   ├── Operations Leader Dashboard ❌
│   ├── Operations Manager Detail ❌
│   ├── Skills Coach Dashboard ✅ (starts here)
│   ├── Skills Coach LP Activities ✅
│   ├── Learner Dashboard ✅
│   └── ... (tabs from their role →)
├── 📊 AAF (generic - if permitted)
└── 💰 Funding Info (generic - if permitted)

CANNOT see:
❌ Senior Leader module
❌ Other divisions
❌ Operations Leader tab
❌ Operations Manager tab (above their level)
```

**Key Insight:**
Users only see tabs at their seniority level and below.

---

## Tab Visibility Matrix (Operations Module Example)

| Tab Name                      | Senior Leader | Ops Leader | Ops Manager | Skills Coach | Learner |
|-------------------------------|---------------|------------|-------------|--------------|---------|
| Operations Leader Dashboard   | ✅            | ✅         | ❌          | ❌           | ❌      |
| Operations Manager Detail     | ✅            | ✅         | ✅          | ❌           | ❌      |
| Skills Coach Dashboard        | ✅            | ✅         | ✅          | ✅           | ❌      |
| Skills Coach LP Activities    | ✅            | ✅         | ✅          | ✅           | ❌      |
| Learner Dashboard             | ✅            | ✅         | ✅          | ✅           | ✅      |
| Learning Plan Overview        | ✅            | ✅         | ✅          | ✅           | ✅      |
| Employer Dashboard            | ✅            | ✅         | ✅          | ✅           | ✅      |
| Learner Drill Through         | ✅            | ✅         | ✅          | ✅           | ✅      |

**Pattern:** Higher roles see their tab + all tabs below them

---

## Module Visibility Matrix

| Module          | Senior Leader | Div Leader | Div Manager | User |
|-----------------|---------------|------------|-------------|------|
| Senior Leader   | ✅            | ❌         | ❌          | ❌   |
| Operations      | ✅ (as Ops Leader) | ✅ (all if Ops Leader, view as Leader if other) | ✅ (if Ops Mgr only) | ✅ (if Ops role only) |
| Quality         | ✅ (as Quality Leader) | ✅ (all if Quality Leader, view as Leader if other) | ✅ (if Quality Mgr only) | ✅ (if Quality role only) |
| Sales           | ✅ (as Sales Leader) | ✅ (all if Sales Leader, view as Leader if other) | ✅ (if Sales Mgr only) | ✅ (if Sales role only) |
| Compliance      | ✅            | ✅         | ✅ (if in Compliance) | ✅ (if in Compliance) |
| AAF (generic)   | ✅            | ✅         | ✅ (if permitted) | ✅ (if permitted) |
| Funding (generic)| ✅           | ✅         | ✅ (if permitted) | ✅ (if permitted) |

---

## Database Schema Design

### Role Hierarchy Table
```sql
CREATE TABLE role_hierarchy (
  role_id UUID PRIMARY KEY REFERENCES roles(id),
  seniority_level INTEGER NOT NULL, -- 1=Senior Leader, 2=Leader, 3=Manager, 4=User
  division TEXT, -- NULL for Senior Leader, 'operations', 'quality', etc.
  can_see_all_divisions BOOLEAN DEFAULT false,
  can_see_cross_division_leader_view BOOLEAN DEFAULT false
);

-- Examples:
-- Senior Leader: level=1, division=NULL, can_see_all=true, cross_div_leader=true
-- Ops Leader: level=2, division='operations', can_see_all=true, cross_div_leader=true
-- Ops Manager: level=3, division='operations', can_see_all=false, cross_div_leader=false
-- Skills Coach: level=4, division='operations', can_see_all=false, cross_div_leader=false
```

### Feature Access Rules
```sql
CREATE TABLE role_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id),
  feature_id UUID REFERENCES role_module_features(id),
  access_type TEXT, -- 'own', 'view_as_leader', 'view_as_manager', 'hidden'

  -- Access determined by:
  -- 1. Feature's minimum seniority level
  -- 2. User's role seniority level
  -- 3. Division matching rules
);
```

### Navigation Generation Logic
```sql
CREATE OR REPLACE FUNCTION get_user_navigation_v2(user_id_param UUID)
RETURNS TABLE (
  module_id UUID,
  module_name TEXT,
  feature_id UUID,
  feature_name TEXT,
  tab_name TEXT,
  powerbi_report_id TEXT,
  access_level TEXT -- 'own', 'leader_view', 'manager_view'
) AS $$
DECLARE
  user_role RECORD;
BEGIN
  -- Get user's role and seniority
  SELECT
    r.id,
    rh.seniority_level,
    rh.division,
    rh.can_see_all_divisions,
    rh.can_see_cross_division_leader_view
  INTO user_role
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN role_hierarchy rh ON rh.role_id = r.id
  WHERE u.id = user_id_param;

  RETURN QUERY
  SELECT
    om.id AS module_id,
    om.name AS module_name,
    rmf.id AS feature_id,
    rmf.display_name AS feature_name,
    rmf.tab_name,
    opr.powerbi_report_id,
    CASE
      -- Senior Leader sees everything
      WHEN user_role.seniority_level = 1 THEN 'leader_view'

      -- Division Leader sees their division as own, others as leader_view
      WHEN user_role.seniority_level = 2 THEN
        CASE
          WHEN om.category = user_role.division THEN 'own'
          WHEN user_role.can_see_cross_division_leader_view THEN 'leader_view'
          ELSE 'hidden'
        END

      -- Manager/User only see their division
      WHEN user_role.seniority_level >= 3 THEN
        CASE
          WHEN om.category = user_role.division
            AND rmf.min_seniority_level >= user_role.seniority_level
          THEN 'own'
          ELSE 'hidden'
        END

      ELSE 'hidden'
    END AS access_level
  FROM organization_modules om
  JOIN role_module_features rmf ON rmf.organization_module_id = om.id
  LEFT JOIN organization_powerbi_reports opr ON opr.id = rmf.organization_report_id
  WHERE om.organization_id = (SELECT organization_id FROM users WHERE id = user_id_param)
    AND om.is_active = true
    AND rmf.is_active = true
  HAVING access_level != 'hidden'
  ORDER BY om.sort_order, rmf.sort_order;
END;
$$ LANGUAGE plpgsql;
```

---

## Key Business Rules

1. **Senior Leader Omniscience:**
   - Can see EVERY module
   - Sees EVERY tab in every module
   - Views everything at LEADER level

2. **Cross-Division Leader Access:**
   - Leaders can see other divisions
   - But they see them at LEADER level (not manager/user level)
   - Example: Operations Leader sees Quality Leader dashboard, not Quality Manager

3. **Division Isolation for Managers/Users:**
   - Managers and below are locked to their division
   - Cannot see other divisions at all
   - Can only see generic/shared modules if explicitly granted

4. **Downward Tab Visibility:**
   - Higher roles see their tab + all tabs below
   - Skills Coach cannot see Operations Manager tab
   - Operations Manager cannot see Operations Leader tab

5. **Generic Module Permissions:**
   - AAF, Funding Info, QAR Scenarios can be granted to anyone
   - Independent of division
   - Based on explicit permissions

---

## Implementation Checklist

- [ ] Add `seniority_level` and `division` to roles table
- [ ] Create `role_hierarchy` configuration table
- [ ] Add `min_seniority_level` to `role_module_features`
- [ ] Create navigation generation function with hierarchy logic
- [ ] Build admin UI to configure seniority levels
- [ ] Test cross-division leader view
- [ ] Test manager division isolation
- [ ] Test tab visibility cascading

---

This is a sophisticated RBAC system with hierarchical role inheritance and cross-division visibility for senior roles!
