# PowerBI Embedded Setup Guide

This guide will walk you through setting up Azure AD authentication for PowerBI Embedded so your reports can render in the tenant portal.

## Prerequisites
- Access to Azure Portal (portal.azure.com)
- PowerBI Pro or Premium license
- Admin access to your PowerBI workspace

## Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (search for it in the top search bar)
3. Click **App registrations** in the left sidebar
4. Click **+ New registration**
5. Fill in the details:
   - **Name**: `PowerBI-SaaS-Platform` (or any name you prefer)
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank for now
6. Click **Register**

## Step 2: Get Your Client ID and Tenant ID

After registration, you'll see the app overview page:

1. **Copy the Application (client) ID** - This is your `POWERBI_CLIENT_ID`
2. **Copy the Directory (tenant) ID** - This is your `POWERBI_TENANT_ID`

Keep these safe - you'll need them later.

## Step 3: Create a Client Secret

1. In your app registration, click **Certificates & secrets** in the left sidebar
2. Click **+ New client secret**
3. Add a description: `PowerBI Embed Secret`
4. Select expiration: Choose 24 months (or your preference)
5. Click **Add**
6. **IMMEDIATELY COPY THE VALUE** - This is your `POWERBI_CLIENT_SECRET`
   - ⚠️ **WARNING**: You can only see this value ONCE. If you navigate away, you'll need to create a new secret.

## Step 4: Configure API Permissions

1. In your app registration, click **API permissions** in the left sidebar
2. Click **+ Add a permission**
3. Select **Power BI Service**
4. Select **Delegated permissions**
5. Check the following permissions:
   - ✓ `Report.Read.All`
   - ✓ `Dataset.Read.All`
   - ✓ `Workspace.Read.All`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Click **Yes** to confirm

## Step 5: Enable Service Principal in PowerBI

1. Go to [PowerBI Admin Portal](https://app.powerbi.com/admin-portal/tenantSettings)
2. Scroll to **Developer settings**
3. Find **Allow service principals to use Power BI APIs**
4. Toggle it to **Enabled**
5. Under "Apply to", select:
   - Option 1: **The entire organization** (easiest for testing)
   - Option 2: **Specific security groups** (better for production - you'll need to create a security group and add your app)
6. Click **Apply**

## Step 6: Add Service Principal to PowerBI Workspace

1. Go to [PowerBI Service](https://app.powerbi.com)
2. Navigate to your workspace (the one you added to Demo Training Provider)
3. Click **Workspace settings** (gear icon or three dots menu)
4. Click **Access**
5. In the "Add people or groups" field, paste your **Application (client) ID** from Step 2
6. Select the app when it appears
7. Set the role to **Member** or **Admin**
8. Click **Add**

## Step 7: Add Credentials to Your Project

1. Open your `.env.local` file in the project root
2. Add these three lines with the values you copied:

```env
POWERBI_CLIENT_ID=your-application-client-id-here
POWERBI_CLIENT_SECRET=your-client-secret-value-here
POWERBI_TENANT_ID=your-directory-tenant-id-here
```

3. Save the file
4. Restart your development server:
   ```bash
   # Kill the current server
   killall node

   # Start fresh
   npm run dev
   ```

## Step 8: Implement the Embed Token API

Once you have the credentials, the embed token endpoint needs to be updated to actually call the Microsoft Graph API. Here's what needs to happen:

1. Install the required package:
   ```bash
   npm install @azure/msal-node
   ```

2. The API will authenticate with Azure AD and request embed tokens for specific reports.

## Verification

After completing these steps:

1. Log in to your tenant portal as a Senior Leader
2. Click on the "Senior Leader" module
3. You should now see the actual PowerBI reports rendering in the tabs

## Troubleshooting

### "Service principal not found"
- Make sure you granted admin consent for API permissions (Step 4)
- Wait 5-10 minutes for Azure AD to propagate changes

### "401 Unauthorized" errors
- Verify your CLIENT_ID, CLIENT_SECRET, and TENANT_ID are correct
- Check that the client secret hasn't expired

### "403 Forbidden" errors
- Ensure the service principal was added to the PowerBI workspace (Step 6)
- Verify it has Member or Admin role

### Reports still not showing
- Restart your dev server after adding environment variables
- Check browser console for specific error messages
- Verify the GUID format of workspace IDs and report IDs in your database

## Security Notes

- **Never commit** your `.env.local` file to git
- Store production credentials in environment variables on your hosting platform (Vercel, Azure, etc.)
- Rotate client secrets periodically
- Use specific security groups instead of "entire organization" for production

## Next Steps After PowerBI Works

Once reports are rendering:
1. Add the remaining 13 reports (you have 21 total, 8 configured so far)
2. Test all modules and roles
3. Build the tenant admin portal for organization administrators
4. Set up automated report deployment
5. Configure RLS (Row-Level Security) in PowerBI for data isolation
