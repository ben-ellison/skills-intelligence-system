# Azure Migration Guide - Skills Intelligence System

## Overview
Migrating from Vercel + Auth0 + Supabase to full Microsoft Azure stack for enhanced security and single-vendor consolidation.

## Architecture

### Current Stack
- **Hosting:** Vercel
- **Authentication:** Auth0
- **Database:** Supabase (PostgreSQL)
- **Attack Surface:** 3 vendors

### Target Stack
- **Hosting:** Azure Static Web Apps
- **Authentication:** Azure AD B2C
- **Database:** Azure Database for PostgreSQL
- **Secrets:** Azure Key Vault
- **Attack Surface:** 1 vendor (Microsoft)

## Phase 1: Azure AD B2C Setup

### 1.1 Create Azure AD B2C Tenant

```bash
# Install Azure CLI
brew install azure-cli

# Login to Azure
az login

# Create resource group
az group create --name skills-intelligence-rg --location uksouth

# Create Azure AD B2C tenant
# Note: This must be done through Azure Portal, not CLI
# Go to: https://portal.azure.com/#create/Microsoft.AzureActiveDirectoryB2C
```

**Portal Steps:**
1. Go to Azure Portal → Create a resource → Search "Azure AD B2C"
2. Create tenant:
   - Organization name: `Skills Intelligence System`
   - Initial domain name: `skillsintelligence` (results in skillsintelligence.onmicrosoft.com)
   - Country: United Kingdom
   - Subscription: Your subscription
   - Resource group: skills-intelligence-rg

### 1.2 Configure User Flows

**Sign Up and Sign In Flow:**
1. In Azure AD B2C → User flows → New user flow
2. Select "Sign up and sign in"
3. Version: Recommended
4. Name: `B2C_1_signupsignin`
5. Identity providers:
   - ✅ Email signup
6. User attributes and token claims:
   - Collect: Email Address, Display Name, Given Name, Surname
   - Return: Email Addresses, Display Name, Given Name, Surname, User's Object ID
7. Multi-factor authentication: Optional (enable for admins later)
8. Conditional access: Not now
9. Create

**Custom Branding:**
1. User flows → B2C_1_signupsignin → Page layouts
2. Upload custom HTML/CSS:
   - Logo: Your company logo
   - Background: Your brand colors
   - Custom CSS for full branding

### 1.3 Register Application

```bash
# In Azure AD B2C tenant, register the Next.js app
# Portal: App registrations → New registration
```

**Application Registration:**
- Name: `Skills Intelligence System`
- Supported account types: Accounts in this organizational directory only
- Redirect URI: 
  - Web: `https://demo1.skillsintelligencesystem.co.uk/api/auth/callback/azure-ad-b2c`
  - Web: `http://localhost:3000/api/auth/callback/azure-ad-b2c` (for dev)
- Click Register

**After Registration:**
1. Note the `Application (client) ID`
2. Note the `Directory (tenant) ID`
3. Go to Certificates & secrets → New client secret
   - Description: NextJS App Secret
   - Expires: 24 months
   - Note the secret VALUE (you won't see it again!)

### 1.4 Configure API Permissions

1. API permissions → Add a permission
2. Microsoft Graph → Delegated permissions
3. Select: `openid`, `profile`, `email`, `offline_access`
4. Grant admin consent

## Phase 2: Update Next.js Application

### 2.1 Install Dependencies

```bash
cd /Users/bcdra/Desktop/skills-intelligence-system

# Install Azure AD B2C provider for NextAuth
npm install @auth/azure-ad-b2c
```

### 2.2 Update Environment Variables

Create `.env.local.azure`:
```bash
# Azure AD B2C Configuration
AZURE_AD_B2C_TENANT_NAME=skillsintelligence
AZURE_AD_B2C_CLIENT_ID=<your-client-id>
AZURE_AD_B2C_CLIENT_SECRET=<your-client-secret>
AZURE_AD_B2C_PRIMARY_USER_FLOW=B2C_1_signupsignin

# NextAuth
NEXTAUTH_URL=https://demo1.skillsintelligencesystem.co.uk
NEXTAUTH_SECRET=<generate-new-secret>

# Azure Database (we'll add this in Phase 3)
# DATABASE_URL=postgresql://...
```

### 2.3 Update NextAuth Configuration

Edit `lib/auth/auth-options.ts`:

```typescript
import AzureADB2C from "@auth/azure-ad-b2c"

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADB2C({
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_B2C_TENANT_NAME!,
      primaryUserFlow: process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
        },
      },
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Your existing logic to check/create user in database
      return true;
    },
    
    async session({ session, token }) {
      // Your existing session logic
      return session;
    },
    
    async jwt({ token, user, account, profile }) {
      // Your existing JWT logic
      return token;
    },
  },
  
  // ... rest of your config
}
```

## Phase 3: Azure Database for PostgreSQL

### 3.1 Create Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group skills-intelligence-rg \
  --name skills-intelligence-db \
  --location uksouth \
  --admin-user dbadmin \
  --admin-password '<strong-password>' \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0-255.255.255.255

# Note: Later restrict public-access to Azure services only
```

### 3.2 Configure Firewall Rules

```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group skills-intelligence-rg \
  --name skills-intelligence-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Temporarily allow your IP for migration
az postgres flexible-server firewall-rule create \
  --resource-group skills-intelligence-rg \
  --name skills-intelligence-db \
  --rule-name AllowMyIP \
  --start-ip-address <your-ip> \
  --end-ip-address <your-ip>
```

### 3.3 Migrate Data from Supabase

```bash
# Export from Supabase
pg_dump "postgresql://postgres.jbxtwhkbqzbpcnhnqgbl:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres" \
  --schema=public \
  --no-owner \
  --no-privileges \
  > supabase_export.sql

# Import to Azure PostgreSQL
psql "postgresql://dbadmin:[PASSWORD]@skills-intelligence-db.postgres.database.azure.com:5432/postgres?sslmode=require" \
  < supabase_export.sql
```

### 3.4 Update Connection Strings

Update `.env.local`:
```bash
DATABASE_URL=postgresql://dbadmin:[PASSWORD]@skills-intelligence-db.postgres.database.azure.com:5432/postgres?sslmode=require
DIRECT_URL=postgresql://dbadmin:[PASSWORD]@skills-intelligence-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

## Phase 4: Azure Static Web Apps

### 4.1 Create Static Web App

```bash
# Create Static Web App linked to GitHub
az staticwebapp create \
  --name skills-intelligence-app \
  --resource-group skills-intelligence-rg \
  --source https://github.com/ben-ellison/skills-intelligence-system \
  --location westeurope \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location ".next" \
  --login-with-github
```

### 4.2 Configure Custom Domain

```bash
# Add custom domain
az staticwebapp hostname set \
  --name skills-intelligence-app \
  --resource-group skills-intelligence-rg \
  --hostname demo1.skillsintelligencesystem.co.uk
```

**DNS Configuration (GoDaddy):**
```
Type: CNAME
Name: demo1
Value: <your-staticwebapp-url>.azurestaticapps.net
TTL: 600
```

### 4.3 Configure Environment Variables

In Azure Portal → Static Web App → Configuration:
```
AZURE_AD_B2C_TENANT_NAME=skillsintelligence
AZURE_AD_B2C_CLIENT_ID=<your-client-id>
AZURE_AD_B2C_CLIENT_SECRET=<your-client-secret>
AZURE_AD_B2C_PRIMARY_USER_FLOW=B2C_1_signupsignin
DATABASE_URL=<connection-string>
NEXTAUTH_URL=https://demo1.skillsintelligencesystem.co.uk
NEXTAUTH_SECRET=<your-secret>
# ... all other env vars
```

## Phase 5: Azure Key Vault

### 5.1 Create Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name skills-intelligence-kv \
  --resource-group skills-intelligence-rg \
  --location uksouth \
  --enable-rbac-authorization false

# Add secrets
az keyvault secret set --vault-name skills-intelligence-kv --name db-password --value '<password>'
az keyvault secret set --vault-name skills-intelligence-kv --name nextauth-secret --value '<secret>'
```

### 5.2 Grant Static Web App Access

```bash
# Get Static Web App managed identity
az staticwebapp identity assign \
  --name skills-intelligence-app \
  --resource-group skills-intelligence-rg

# Grant Key Vault access
az keyvault set-policy \
  --name skills-intelligence-kv \
  --object-id <managed-identity-id> \
  --secret-permissions get list
```

## Phase 6: Testing & Validation

### 6.1 Test Authentication

1. Visit https://demo1.skillsintelligencesystem.co.uk
2. Click "Login"
3. Should see YOUR branded login page (not Microsoft)
4. Sign up with email/password
5. Verify user created in Azure AD B2C
6. Verify user record created in PostgreSQL

### 6.2 Test Database

```bash
# Connect to Azure PostgreSQL
psql "postgresql://dbadmin:[PASSWORD]@skills-intelligence-db.postgres.database.azure.com:5432/postgres?sslmode=require"

# Verify tables
\dt

# Check user count
SELECT COUNT(*) FROM users;
```

### 6.3 Test End-to-End

- [ ] User signup works
- [ ] User login works
- [ ] Module pages load
- [ ] PowerBI reports embed correctly
- [ ] Super Admin portal works
- [ ] Tenant Admin portal works
- [ ] Database queries perform well

## Phase 7: Cut Over

### 7.1 Final DNS Update

1. Update DNS to point to Azure Static Web Apps
2. Wait for propagation (5-30 minutes)
3. Test production URL

### 7.2 Disable Old Services

1. Archive Vercel deployment (don't delete yet)
2. Disable Auth0 (keep for 30 days as backup)
3. Download Supabase backup (keep for 90 days)

### 7.3 Monitor

- Azure Monitor → Application Insights
- Set up alerts for errors, performance
- Monitor costs in Cost Management

## Rollback Plan

If issues occur:
1. Revert DNS to Vercel
2. Re-enable Auth0
3. Reconnect to Supabase
4. Debug Azure issues offline

## Cost Estimate

- Azure AD B2C: $0 (first 50,000 auths/month free)
- Azure Static Web Apps: $9/month (Standard tier)
- Azure Database for PostgreSQL: ~$100/month (Standard_B2s)
- Azure Key Vault: ~$5/month
- **Total: ~$115/month**

## Security Checklist

- [ ] Azure AD B2C MFA enabled for admins
- [ ] Database firewall restricted to Azure services only
- [ ] Key Vault secrets rotated
- [ ] All connections use SSL/TLS
- [ ] Managed identities for service-to-service auth
- [ ] Azure Security Center enabled
- [ ] Backup and disaster recovery configured
- [ ] UK data residency confirmed

## Support Contacts

- Azure Support: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- Microsoft Security Response: secure@microsoft.com
- Azure AD B2C Docs: https://learn.microsoft.com/azure/active-directory-b2c/

---

**Migration Status:** Ready to begin
**Timeline:** 2-3 weeks
**Risk Level:** Medium (with proper testing)
