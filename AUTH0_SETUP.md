# Auth0 Setup Guide

This guide will help you set up Auth0 for the Skills Intelligence System with enterprise-grade security for handling sensitive children's data.

## Why Auth0?

- **Enterprise-grade security**: SOC 2, ISO 27001, GDPR compliant
- **Multi-tenant Organizations**: Built-in support for isolating tenants
- **Advanced RBAC**: Granular permissions and role management
- **Anomaly detection**: Bot detection, brute force protection
- **MFA support**: Required for admin access
- **Audit logging**: Complete authentication audit trails

## Step 1: Create Auth0 Account

1. Go to [auth0.com](https://auth0.com)
2. Sign up for a new account or login
3. Choose region closest to your users (UK/EU for GDPR compliance)

## Step 2: Create Application

1. In Auth0 Dashboard, go to **Applications** → **Applications**
2. Click **Create Application**
3. Name: `Skills Intelligence System`
4. Type: **Regular Web Application**
5. Technology: **Next.js**
6. Click **Create**

## Step 3: Configure Application Settings

In your application settings:

### Allowed Callback URLs
```
http://localhost:3000/api/auth/callback
https://yourdomain.com/api/auth/callback
https://*.yourdomain.com/api/auth/callback
```

### Allowed Logout URLs
```
http://localhost:3000
https://yourdomain.com
https://*.yourdomain.com
```

### Allowed Web Origins
```
http://localhost:3000
https://yourdomain.com
https://*.yourdomain.com
```

### Application Login URI
```
http://localhost:3000/api/auth/login
```

## Step 4: Get Credentials

From the application settings, copy:

1. **Domain** (e.g., `dev-abc123.uk.auth0.com`)
2. **Client ID**
3. **Client Secret**

Update your `.env.local`:

```bash
AUTH0_SECRET=SUljqdtohknpDGLzw5vLpOq4ipvwXjZMB4TinxrKro0=  # Already set
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://dev-abc123.uk.auth0.com  # Your Domain
AUTH0_CLIENT_ID=your_client_id_here
AUTH0_CLIENT_SECRET=your_client_secret_here
AUTH0_AUDIENCE=https://dev-abc123.uk.auth0.com/api/v2/
```

## Step 5: Enable Auth0 Organizations (Multi-Tenancy)

1. Go to **Organizations** in the sidebar
2. Click **Enable Organizations**
3. This allows tenant isolation with subdomain routing

### Create Your First Organization

1. Click **Create Organization**
2. Name: `Demo Training Provider`
3. Display Name: `Demo Training Provider`
4. This will map to your `organizations` table in Supabase

## Step 6: Configure Roles & Permissions

### Create API

1. Go to **Applications** → **APIs**
2. Click **Create API**
3. Name: `Skills Intelligence API`
4. Identifier: `https://api.skillsintelligence.com`
5. Signing Algorithm: RS256

### Create Permissions

Add these permissions to your API:

```
read:reports
read:organization
write:organization
read:users
write:users
manage:subscription
manage:billing
manage:platform (super admin only)
```

### Create Roles

Create these roles with mapped permissions:

**1. Super Admin**
- All permissions including `manage:platform`
- For platform administrators only

**2. Tenant Admin**
- `read:organization`, `write:organization`
- `read:users`, `write:users`
- `manage:subscription`, `manage:billing`
- `read:reports`

**3. Senior Leader**
- `read:reports` (all reports in org)
- `read:organization`

**4. Operations Leader**
- `read:reports` (subset based on role overrides)
- `read:organization`

**5-8. Other Roles** (Operations Manager, MIS Team, Curriculum Team, Assessor Team)
- `read:reports` (specific reports based on role)
- `read:organization`

## Step 7: Configure Security Settings

### Brute Force Protection
1. Go to **Security** → **Attack Protection**
2. Enable **Brute Force Protection**
3. Configure lockout thresholds

### Bot Detection
1. Enable **Bot Detection**
2. Configure CAPTCHA for suspicious logins

### Multi-Factor Authentication
1. Go to **Security** → **Multi-Factor Auth**
2. Enable **One-Time Password** and **SMS**
3. **IMPORTANT**: Require MFA for:
   - Super Admin role
   - Tenant Admin role
   - Any user accessing sensitive data

### Anomaly Detection
1. Enable **Suspicious IP Throttling**
2. Enable **Breached Password Detection**

## Step 8: Configure Actions (Custom Logic)

We'll use Auth0 Actions to sync user data with Supabase.

### Create Action: Sync User to Supabase

1. Go to **Actions** → **Library**
2. Click **Build Custom**
3. Name: `Sync User to Supabase`
4. Trigger: **Login / Post Login**
5. Code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const axios = require('axios');

  // Get user metadata
  const userId = event.user.user_id;
  const email = event.user.email;
  const name = event.user.name;
  const orgId = event.organization?.id;

  // Sync to Supabase
  try {
    await axios.post('https://your-domain.com/api/sync-user', {
      auth0_user_id: userId,
      email: email,
      full_name: name,
      organization_id: orgId
    }, {
      headers: {
        'Authorization': `Bearer ${event.secrets.SYNC_SECRET}`
      }
    });
  } catch (error) {
    console.error('Failed to sync user:', error);
  }

  // Add custom claims to token
  api.idToken.setCustomClaim('org_id', orgId);
  api.idToken.setCustomClaim('roles', event.user.app_metadata?.roles || []);
};
```

6. Add secret: `SYNC_SECRET` (we'll create this endpoint later)
7. Deploy the Action
8. Add to **Login** flow

## Step 9: Configure Email Templates

1. Go to **Branding** → **Email Templates**
2. Customize templates for:
   - Welcome Email
   - Password Reset
   - Email Verification
   - Blocked Account
3. Use your domain for branding

## Step 10: Custom Domain (Production)

For production, use your own domain:

1. Go to **Branding** → **Custom Domains**
2. Add: `auth.aivii.co.uk`
3. Follow DNS verification steps
4. Update all callback URLs to use custom domain

## Step 11: Organization Invitation Flow

For inviting users to tenant organizations:

```javascript
// In your tenant admin portal
const inviteUser = async (email: string, orgId: string, roles: string[]) => {
  const response = await fetch('/api/invite-user', {
    method: 'POST',
    body: JSON.stringify({
      email,
      organization_id: orgId,
      roles
    })
  });
};
```

This will use Auth0 Organizations API to invite users.

## Step 12: Testing

Test authentication flow:

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/api/auth/login`
3. You should be redirected to Auth0 login
4. After login, redirected back to your app

## Security Checklist

- [ ] MFA enabled for admin roles
- [ ] Brute force protection enabled
- [ ] Bot detection enabled
- [ ] Anomaly detection enabled
- [ ] Email verification required
- [ ] Custom domain configured (production)
- [ ] HTTPS only (production)
- [ ] Session timeout configured (30 minutes for sensitive data)
- [ ] Audit logs enabled
- [ ] Breached password detection enabled

## Data Flow

```
User Login → Auth0 Authentication
    ↓
Auth0 Post-Login Action → Sync to Supabase
    ↓
JWT with Custom Claims → Next.js
    ↓
Middleware Validates JWT → Extract org_id & roles
    ↓
Supabase Query with RLS → Data filtered by org_id
```

## Next Steps

After completing this setup:

1. Create your first user in Auth0
2. Assign them to an Organization
3. Assign Super Admin role
4. Test login flow
5. Verify Supabase sync works

---

**Need Help?**

- Auth0 Docs: https://auth0.com/docs/quickstart/webapp/nextjs
- Auth0 Organizations: https://auth0.com/docs/manage-users/organizations
- Auth0 RBAC: https://auth0.com/docs/manage-users/access-control/rbac
