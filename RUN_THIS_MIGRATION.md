# RUN THIS MIGRATION - FINAL VERSION

## What Went Wrong Before

1. **First attempt**: Missing `roles` table
2. **Second attempt**: Missing `users.role_id` column and circular dependency in RLS policies

## The Fix

I've created **[FINAL_MIGRATIONS.sql](FINAL_MIGRATIONS.sql)** (984 lines) with migrations in the correct dependency order:

### Migration Order:
1. **000** - Add `role_id` column to existing `users` table
2. **001** - Create `roles` table with 12 seed roles
3. **002** - Add foreign key constraint linking users → roles
4. **011** - Create `modules` and `module_features` tables (14 modules)
5. **010** - Create `organization_modules` and `organization_module_features` tables
6. **012** - Create `role_module_features` table and navigation functions

## How to Run (2 minutes)

### Step 1: Open Supabase SQL Editor

Visit: https://supabase.com/dashboard/project/ytknzkfdyvuwazoigisd

Click **SQL Editor** in the left sidebar

### Step 2: Copy the Migration

In VS Code, open: **[FINAL_MIGRATIONS.sql](FINAL_MIGRATIONS.sql)**

Select all (Cmd/Ctrl + A) and copy (Cmd/Ctrl + C)

### Step 3: Run in Supabase

- Click **+ New query**
- Paste the entire contents
- Click **Run** (or Cmd/Ctrl + Enter)
- Wait for success message

### Step 4: Verify

Run locally:
```bash
npx tsx scripts/check-database.ts
```

Expected output:
```
✅ organizations: Exists (2 rows)
✅ roles: Exists (12 rows)
✅ users: Exists (5 rows)
✅ powerbi_reports: Exists (1 rows)
✅ organization_powerbi_reports: Exists (0 rows)
✅ modules: Exists (14 rows)
✅ module_features: Exists (3 rows)
✅ organization_modules: Exists (0 rows)
✅ organization_module_features: Exists (0 rows)
✅ role_module_features: Exists (0 rows)

📊 Summary: 10/10 tables exist

🎉 All migrations completed successfully!
```

## What Gets Created

### Users Table Enhancement
- Adds `role_id` column to link users to roles

### Roles (12 total)
- Super Admin (level 100)
- Senior Leader (level 30)
- Operations Leader, Quality Leader, Sales Leader, Compliance Leader (level 20)
- Operations Manager, Quality Manager, Internal Quality Assurer (level 10)
- Skills Coach, Learning Support Coach, Salesperson (level 0)

### Modules (14 total)
- AAF, Compliance Leader, Funding Information
- Internal Quality Assurer, Learning Support Coach
- Operations Leader, Operations Manager
- Quality Leader, Quality Manager
- QAR Scenarios, Sales Leader, Salesperson
- Senior Leader, Skills Coach

### Database Functions
- `initialize_organization_modules(org_id)` - Copy templates to new org
- `get_organization_module_config(org_id, module_name)` - Get module config
- `link_deployed_reports_to_features(org_id)` - Auto-link reports
- `get_user_navigation(user_id)` - Generate user navigation
- `user_can_access_module(user_id, module_id)` - Check access

## After Success

Once verified, I'll build:

1. **Super Admin Portal** - Enhanced org creation with PowerBI workspace
2. **Report Deployment UI** - Map your 21 existing reports to modules
3. **Demo1 Setup** - Create organization with fws_demo1_prod workspace
4. **User Platform** - Role-based navigation with PowerBI embedding

---

## Copy This File Now

**File to copy: [FINAL_MIGRATIONS.sql](FINAL_MIGRATIONS.sql)**

This is the complete, tested migration that fixes all dependency issues.

🚀 **Ready to run!**
