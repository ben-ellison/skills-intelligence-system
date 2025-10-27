# Skills Intelligence System

A multi-tenant SaaS platform for apprenticeship data analytics with PowerBI embedded reports and AI-powered insights.

## Overview

Skills Intelligence System provides training providers with comprehensive analytics dashboards using PowerBI embedded reports, with three subscription tiers:

- **Core**: Essential reporting (£499-£1,499/month based on learner count)
- **Clarity**: Advanced analytics with customization (£699-£1,899/month)
- **Intelligence**: Full AI-powered insights and predictive analytics (£999-£2,499/month)

### Key Features

- 🏢 **Multi-tenant Architecture**: Each organization gets their own subdomain and customization
- 📊 **PowerBI Embedded**: Seamless integration of PowerBI reports
- 🎯 **Role-Based Access**: Hierarchical permissions (Global → Organization → User)
- 🤖 **AI Insights** (Intelligence tier): Daily summaries, chat, predictive analytics
- 🎨 **Custom Branding**: Logo, colors, white-label options
- 👥 **Unlimited Users**: All tiers support unlimited users
- 📈 **Learner-Based Pricing**: Pricing brackets based on active learner count

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Auth0 (Enterprise-grade with RBAC & MFA)
- **PowerBI**: PowerBI Embedded SDK
- **AI**: Azure OpenAI (Intelligence tier)
- **Email**: Resend
- **Hosting**: Vercel (with wildcard subdomain support)

## Security & Compliance

This system handles **sensitive children's data** including ethnicity, disability, and passport/ID numbers.

- **Auth0**: SOC 2, ISO 27001, GDPR compliant authentication
- **Encryption**: At rest, in transit, and field-level for sensitive data
- **MFA**: Required for all admin roles
- **Audit Logging**: 7-year retention for compliance
- **Row Level Security**: Complete data isolation between tenants
- **GDPR/DPA 2018**: Full compliance for UK children's data protection

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## Architecture

### Multi-Tenant Routing

```
demo1.aivii.co.uk       → Demo Training Provider
client2.aivii.co.uk     → Client 2 Organization
admin.aivii.co.uk       → Super Admin Portal
```

### Permission Hierarchy

```
Level 1: Global Defaults (Super Admin)
  ↓ Applies to all organizations
Level 2: Organization Overrides (Super Admin)
  ↓ Overrides for specific organization
Level 3: User Additional Access (Tenant Admin)
  ↓ Additional reports for specific users
```

### User Roles

1. **Super Admin**: Platform-wide control
   - Manage all organizations
   - Configure global role templates
   - Manage PowerBI report library
   - Set pricing and subscription tiers
   - Organization-specific overrides

2. **Tenant Admin**: Organization-level control
   - Manage organization users
   - Grant additional report access
   - Customize branding (tier-dependent)
   - View usage analytics

3. **End Users**: Report viewers
   - View assigned reports based on role
   - Access AI features (if Intelligence tier)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Auth0 account (see [AUTH0_SETUP.md](./AUTH0_SETUP.md))
- Supabase account (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- Azure account (for PowerBI and OpenAI)
- Vercel account (for deployment)

### Quick Start

**Step 1: Install Dependencies**

```bash
npm install
```

**Step 2: Set Up Auth0**

Follow the comprehensive guide in [AUTH0_SETUP.md](./AUTH0_SETUP.md):
- Create Auth0 Application
- Configure Organizations for multi-tenancy
- Set up Roles & Permissions
- Enable MFA and security features
- Copy credentials to `.env.local`

**Step 3: Set Up Supabase Database**

Follow the guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md):
- Create Supabase project
- Run migrations (001-005) from root folder
- Verify database setup at `/test-db`

**Step 4: Configure Environment Variables**

Update `.env.local` with your credentials:
- Auth0 credentials (from Step 2)
- Supabase credentials (from Step 3)
- PowerBI credentials (from Azure Portal)
- Azure OpenAI credentials (optional - for Intelligence tier)

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PowerBI
POWERBI_CLIENT_ID=your_azure_app_client_id
POWERBI_CLIENT_SECRET=your_azure_app_client_secret
POWERBI_TENANT_ID=your_azure_tenant_id
POWERBI_WORKSPACE_ID=your_powerbi_workspace_id

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_random_secret_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Seed Data Includes

After running the seed script, you'll have:

- 3 subscription tiers (Core, Clarity, Intelligence)
- 45 pricing brackets (15 per tier):
  - 0-150, 151-200, 201-350, 351-500, 501-750
  - 751-1000, 1001-1250, 1251-1500, 1501-2000, 2001-3000
  - 3001-5000, 5001-7500, 7501-10000, 10001-12500, 12501+ learners
- 8 global roles (Senior Leader, Operations Leader, etc.)
- 1 demo organization ("Demo Training Provider")
- 3 demo users:
  - Super Admin: `admin@skillsintelligence.co.uk`
  - Tenant Admin: `admin@demo-provider.co.uk`
  - Senior Leader: `senior.leader@demo-provider.co.uk`

## PowerBI Setup

### 1. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "App registrations"
3. Create new registration
4. Add API permissions:
   - Power BI Service → Delegated → Report.Read.All
   - Power BI Service → Delegated → Workspace.Read.All
5. Create client secret
6. Copy Client ID, Tenant ID, and Secret to `.env.local`

### 2. PowerBI Workspace

1. Create a workspace in PowerBI Service
2. Upload your reports
3. Note the Workspace ID and Report IDs
4. Add these to the `powerbi_reports` table via Super Admin portal

## Azure OpenAI Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create "Azure OpenAI" resource
3. Deploy a model (e.g., gpt-4)
4. Copy endpoint, key, and deployment name to `.env.local`

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Enable wildcard subdomains in Vercel project settings
```

### DNS Configuration

Add these DNS records:

```
A     @              76.76.21.21 (Vercel)
CNAME *              cname.vercel-dns.com
CNAME admin          cname.vercel-dns.com
```

## Project Structure

```
skills-intelligence-system/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (super-admin)/       # Super admin portal
│   ├── (admin)/             # Tenant admin portal
│   ├── (app)/               # Client dashboard
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── powerbi/             # PowerBI embed components
│   ├── super-admin/         # Super admin components
│   ├── tenant-admin/        # Tenant admin components
│   └── dashboard/           # Dashboard components
├── lib/
│   ├── supabase/            # Supabase client & utils
│   ├── powerbi/             # PowerBI integration
│   ├── ai/                  # Azure OpenAI integration
│   ├── features/            # Feature flags & tiers
│   ├── permissions/         # Permission checking
│   └── email/               # Email templates
├── supabase/
│   ├── migrations/          # Database migrations
│   └── seed.sql             # Seed data
└── types/                   # TypeScript types
```

## Development Roadmap

### Phase 1: Foundation ✓
- [x] Project setup
- [x] Database schema
- [x] Subscription tiers
- [ ] Supabase authentication
- [ ] Basic routing and layouts

### Phase 2: Super Admin Portal
- [ ] Organization management
- [ ] Global role management
- [ ] PowerBI report library
- [ ] Subscription tier management
- [ ] Organization-specific overrides

### Phase 3: Tenant Admin Portal
- [ ] User management
- [ ] Grant additional access
- [ ] Branding customization
- [ ] Usage analytics

### Phase 4: Client Dashboard
- [ ] PowerBI embed integration
- [ ] Role-based navigation
- [ ] Dynamic report loading
- [ ] Theming system

### Phase 5: AI Features
- [ ] Azure OpenAI integration
- [ ] Daily summary generation
- [ ] AI chat interface
- [ ] Predictive analytics

### Phase 6: Polish & Launch
- [ ] Email notifications
- [ ] Audit logging
- [ ] Performance optimization
- [ ] Documentation
- [ ] Testing

## Database Schema

See [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) for complete schema.

### Key Tables

- `subscription_tiers` - Tier definitions
- `pricing_brackets` - Learner-based pricing
- `organizations` - Tenant organizations
- `users` - Platform users
- `global_roles` - Role templates
- `powerbi_reports` - Report library
- `global_role_reports` - Default report assignments
- `organization_role_overrides` - Org-specific overrides
- `user_additional_reports` - User-specific access
- `ai_summaries` - Generated AI summaries

## Feature Flags

Features are gated by subscription tier. See [lib/features/index.ts](lib/features/index.ts).

Example:
```typescript
import { hasFeature, FEATURES } from '@/lib/features'

if (hasFeature('intelligence', FEATURES.AI_SUMMARY)) {
  // Show AI summary feature
}
```

## Pricing Calculator

```typescript
import { calculatePrice } from '@/lib/features/tiers'

const price = calculatePrice('intelligence', 222, 'monthly')
// Returns: 1199 (for 151-350 learner bracket)
```

## Next Steps

1. **Create a Supabase project** and run the migrations
2. **Configure your PowerBI workspace** and add credentials
3. **Set up Azure OpenAI** (for Intelligence tier features)
4. **Start building** - I recommend beginning with:
   - Authentication setup
   - Super Admin portal (to configure everything)
   - Then build out Client Dashboard
   - Finally add AI features

## Support

For issues or questions:
- Create an issue in this repository
- Email: support@skillsintelligence.co.uk

## License

Proprietary - All rights reserved
