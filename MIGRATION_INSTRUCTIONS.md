# Run Migrations in Supabase

## The Issue

The previous migration failed because the `roles` table didn't exist yet. I've now created a complete migration file that includes everything in the correct order.

## Steps to Run Migrations

### Option 1: All at Once (Recommended)

1. **Open Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/ytknzkfdyvuwazoigisd
   - Click **SQL Editor** in left sidebar

2. **Run Complete Migration:**
   - Click **+ New query**
   - Copy the entire contents of **`COMPLETE_MIGRATIONS.sql`** (965 lines)
   - Paste into SQL editor
   - Click **Run** (or Cmd/Ctrl + Enter)
   - ✅ Wait for "Success. No rows returned" message

### Option 2: Step by Step (If Option 1 fails)

Run these files in order:

1. **001_create_roles_table.sql** - Creates roles table with seed data
2. **011_modules_and_features_schema.sql** - Creates modules and features
3. **010_per_tenant_module_configuration.sql** - Creates per-tenant config
4. **012_role_based_module_features.sql** - Creates role-based navigation

For each file:
- Click **+ New query** in SQL Editor
- Copy entire file contents
- Paste and click **Run**
- Verify success before moving to next

## What Gets Created

### 1. Roles Table (001)
- `roles` table with 12 seeded roles:
  - Super Admin, Senior Leader
  - Operations Leader, Operations Manager
  - Quality Leader, Quality Manager
  - Sales Leader, Salesperson
  - Compliance Leader
  - Skills Coach, Learning Support Coach
  - Internal Quality Assurer

### 2. Global Module Templates (011)
- `modules` table with 14 modules (AAF, Compliance Leader, Operations Leader, etc.)
- `module_features` table for pages within modules
- Seeds example features for Quality Leader and Operations Leader

### 3. Per-Tenant Configuration (010)
- `organization_modules` - Tenant-specific module instances
- `organization_module_features` - Tenant-specific feature overrides
- `initialize_organization_modules()` function
- `link_deployed_reports_to_features()` function

### 4. Role-Based Navigation (012)
- `role_module_features` - Maps roles to specific pages
- `get_user_navigation()` function - Generates nav for logged-in users
- `user_can_access_module()` function

## Verify Success

After running migrations, verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'roles',
  'modules',
  'module_features',
  'organization_modules',
  'organization_module_features',
  'role_module_features'
)
ORDER BY table_name;
```

Should return all 6 tables.

Check seeded data:

```sql
-- Should return 12 roles
SELECT name, display_name, level FROM roles ORDER BY level DESC, name;

-- Should return 14 modules
SELECT name, display_name, sort_order FROM modules ORDER BY sort_order;
```

## Next Steps

Once migrations complete successfully, I'll build:

1. **Super Admin Portal** - Enhanced organization form
2. **Manual Report Deployment** - Map your 21 reports
3. **Demo1 Setup** - Create organization and test with real data

---

**Let me know when migrations are done!** 🚀
