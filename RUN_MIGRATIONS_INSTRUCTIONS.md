# How to Run Migrations in Supabase

Since the direct psql connection isn't working, please run the migrations manually through the Supabase SQL Editor:

## Steps:

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/ytknzkfdyvuwazoigisd
   - Navigate to: **SQL Editor** (in left sidebar)

2. **Run Migration 011 first** (creates core tables):
   - Click **+ New query**
   - Copy the entire contents of `011_modules_and_features_schema.sql`
   - Paste into the SQL editor
   - Click **Run** (or press Cmd/Ctrl + Enter)
   - ✅ Verify it says "Success. No rows returned"

3. **Run Migration 010 second** (creates per-tenant tables):
   - Click **+ New query**
   - Copy the entire contents of `010_per_tenant_module_configuration.sql`
   - Paste into the SQL editor
   - Click **Run**
   - ✅ Verify success

4. **Run Migration 012 third** (creates role-based features):
   - Click **+ New query**
   - Copy the entire contents of `012_role_based_module_features.sql`
   - Paste into the SQL editor
   - Click **Run**
   - ✅ Verify success

## What These Migrations Do:

### 011 - Creates Global Templates:
- `modules` table (14 modules like AAF, Skills Coach, Operations Leader, etc.)
- `module_features` table (pages/tabs within each module)
- Seeds initial modules based on your current platform

### 010 - Creates Per-Tenant Configuration:
- `organization_modules` (tenant-specific module instances)
- `organization_module_features` (tenant-specific feature overrides)
- Function to copy templates to new organizations

### 012 - Creates Role-Based Navigation:
- `role_module_features` (maps roles to features)
- `get_user_navigation()` function (generates navigation for logged-in users)

## Verify Success:

After running all three migrations, run this query in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'modules',
  'module_features',
  'organization_modules',
  'organization_module_features',
  'role_module_features'
)
ORDER BY table_name;
```

You should see all 5 tables listed.

## Check Seeded Data:

```sql
SELECT name, display_name, sort_order
FROM modules
ORDER BY sort_order;
```

You should see 14 modules (AAF, Compliance Leader, Funding Info, etc.)

---

## Next Steps After Migrations Complete:

Once migrations are successful, I'll build:

1. **Super Admin Portal** - Enhanced organization form to add Demo1
2. **Manual Report Deployment** - UI to map your 21 reports to modules
3. **User-Facing Platform** - Role-based navigation with PowerBI embedding

Let me know when the migrations are done!
