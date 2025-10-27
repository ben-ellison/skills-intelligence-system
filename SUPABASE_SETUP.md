# Supabase Setup Guide

This guide will walk you through setting up Supabase for the Skills Intelligence System.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `skills-intelligence-system`
   - **Database Password**: Generate a strong password (save it securely!)
   - **Region**: **UK South** or **North Europe** (for GDPR compliance - children's data)
   - **Pricing Plan**: Pro or higher (for production - includes daily backups)

4. Click **"Create new project"** (takes ~2 minutes)

## Step 2: Get Project Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy the following values:

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGc...
service_role key: eyJhbGc... (⚠️ Keep secret!)
```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

## Step 4: Run Database Migrations

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New Query"**

### Migration 1: Initial Schema

3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. You should see: ✅ **Success. No rows returned**

### Migration 2: Security & RLS Policies

7. Click **"New Query"** again
8. Copy the entire contents of `supabase/migrations/002_security_rls_policies.sql`
9. Paste and click **"Run"**
10. You should see: ✅ **Success. No rows returned**

### Migration 3: Seed Data

11. Click **"New Query"** again
12. Copy the entire contents of `supabase/seed.sql`
13. Paste and click **"Run"**
14. You should see output like:
    ```
    NOTICE:  ✓ Seed data loaded successfully:
    NOTICE:    - 3 subscription tiers
    NOTICE:    - 45 pricing brackets
    NOTICE:    - 8 global roles
    NOTICE:    - 1 organizations
    NOTICE:    - 3 users
    ```

## Step 5: Verify Tables

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `subscription_tiers`
   - `pricing_brackets`
   - `organizations`
   - `users`
   - `global_roles`
   - `powerbi_reports`
   - `ai_summaries`
   - `audit_log`
   - etc. (14 tables total)

3. Click on `organizations` → you should see 1 row: "Demo Training Provider"
4. Click on `users` → you should see 3 users

## Step 6: Configure Authentication

1. Go to **Authentication** → **Providers** in Supabase
2. Configure **Email** provider:
   - ✅ Enable Email provider
   - ✅ Confirm email: **ENABLED** (important for children's data)
   - ✅ Secure email change: **ENABLED**

3. Configure **Email Templates**:
   - Go to **Authentication** → **Email Templates**
   - Customize the templates (or leave defaults for now)

4. **Password Requirements** (under Authentication → Policies):
   - Minimum length: **12 characters**
   - Require uppercase: ✅
   - Require lowercase: ✅
   - Require numbers: ✅
   - Require special characters: ✅

## Step 7: Configure Security Settings

### Database Settings

1. Go to **Project Settings** → **Database**
2. **SSL Enforcement**: Ensure it's enabled
3. **Connection Pooling**: Enable for production

### API Settings

1. Go to **Project Settings** → **API**
2. **JWT expiry**: Set to `28800` (8 hours)
3. **JWT secret**: Keep the auto-generated one (don't change)

## Step 8: Set Up Row Level Security (RLS)

The RLS policies were created in migration 002, but let's verify:

1. Go to **Database** → **Tables**
2. Click on `organizations` table
3. Click **"Policies"** tab
4. You should see policies like:
   - `org_own_data_only`
   - etc.

If you don't see policies, re-run migration 002.

## Step 9: Test Database Connection

In your terminal:

```bash
cd /Users/bcdra/Desktop/skills-intelligence-system
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

If it loads without errors, your Supabase connection is working!

## Step 10: Create First Super Admin User

We need to create a real auth user and link it to the seeded super admin:

### Option A: Via Supabase Dashboard (Easiest)

1. Go to **Authentication** → **Users**
2. Click **"Add User"**
3. Fill in:
   - **Email**: Your email (e.g., `admin@skillsintelligence.co.uk`)
   - **Password**: Create a strong password
   - **Auto Confirm User**: ✅ (check this)
4. Click **"Create User"**
5. Copy the **User ID** (UUID)

6. Go to **SQL Editor** → **New Query**
7. Run this query (replace the UUIDs):
   ```sql
   UPDATE users
   SET auth_user_id = 'paste-the-user-id-from-step-5'
   WHERE email = 'admin@skillsintelligence.co.uk';
   ```

8. Now you can login at [http://localhost:3000/login](http://localhost:3000/login)

### Option B: Via Signup Flow (Once Built)

Once we build the signup flow, you can create users through the app.

## Security Checklist ✅

Before going live, ensure:

- [ ] ✅ RLS enabled on all tables
- [ ] ✅ Service role key is NOT in client-side code
- [ ] ✅ JWT expiry is set (8 hours recommended)
- [ ] ✅ Email confirmation is enabled
- [ ] ✅ Strong password policy configured
- [ ] ✅ SSL enforcement enabled
- [ ] ✅ Database backups enabled (Pro plan)
- [ ] ✅ Region is UK/EU (for GDPR compliance)
- [ ] ✅ Audit logging working (test by accessing data)

## Troubleshooting

### Error: "relation does not exist"
- You didn't run the migrations. Go back to Step 4.

### Error: "JWT expired"
- Your session expired. Clear cookies and login again.

### Error: "permission denied for table"
- RLS is blocking access. Check policies in migration 002.
- Or you're not logged in as the right user type.

### Can't see any data in tables
- RLS is working! You need to be logged in as a user.
- Or use the service role key to bypass RLS (admin operations only).

### Error: "Invalid API key"
- Check your `.env.local` file has the correct values
- Restart the dev server after changing env vars

## Next Steps

Once Supabase is set up:

1. ✅ **Build authentication pages** (login, signup, reset password)
2. ✅ **Build Super Admin portal** (organization management)
3. ✅ **Connect PowerBI** (workspace setup)
4. ✅ **Test with demo organization**

---

## Important Security Notes

⚠️ **NEVER commit `.env.local` to git**
⚠️ **Service role key bypasses RLS** - only use server-side
⚠️ **This handles children's data** - treat with highest security
⚠️ **Enable MFA** for super admin and tenant admin accounts (in production)

For questions or issues, see [SECURITY.md](SECURITY.md) for full security documentation.
