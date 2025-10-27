# Security & Data Protection

## Overview

Skills Intelligence System handles **sensitive children's data** including:
- Personal identifiable information (PII)
- Ethnicity and protected characteristics
- Disability information
- Passport and ID numbers
- Educational records
- Apprenticeship progress data

## Compliance Requirements

### UK Data Protection Act 2018 (DPA 2018)
- GDPR compliance for EU/UK data subjects
- Special category data (Article 9) - ethnicity, disability
- Children's data (enhanced protections under Article 8)
- Data Processing Agreement (DPA) with all organizations

### Age of Digital Consent
- UK: 13 years old
- Enhanced parental consent mechanisms
- Age-appropriate privacy notices

### Key Principles
1. **Lawfulness, fairness, and transparency**
2. **Purpose limitation**
3. **Data minimisation**
4. **Accuracy**
5. **Storage limitation**
6. **Integrity and confidentiality**
7. **Accountability**

## Security Architecture

### 1. Data Classification

#### Tier 1: Highly Sensitive (Encrypted at rest + field-level encryption)
- Passport numbers
- National Insurance numbers
- Any government ID numbers
- Disability details
- Medical information

#### Tier 2: Sensitive (Encrypted at rest + RLS)
- Ethnicity
- Date of birth
- Address
- Contact information
- Learning disability markers
- Special educational needs (SEN)

#### Tier 3: Protected (Encrypted at rest + RLS)
- Names
- Email addresses
- Phone numbers
- Apprenticeship data
- Assessment results

#### Tier 4: Aggregated/Anonymized (Platform insights)
- Statistical data
- Trend analysis
- Benchmarking (no PII)

### 2. Encryption

#### Encryption at Rest
- **Supabase**: Built-in AES-256 encryption for all database storage
- **Backups**: Encrypted with separate keys
- **PowerBI Datasets**: Stored in encrypted Azure storage

#### Encryption in Transit
- **TLS 1.3** for all connections
- **HTTPS only** - no HTTP allowed
- **PowerBI Embed**: Secured embed tokens (15-min expiry)

#### Field-Level Encryption (for Tier 1 data)
```typescript
// High-sensitivity fields encrypted with organization-specific keys
// Stored in Supabase Vault (encrypted key storage)

import { createClient } from '@supabase/supabase-js'

async function encryptSensitiveField(orgId: string, data: string) {
  const supabase = createClient(url, key)

  // Get org-specific encryption key from Vault
  const { data: secrets } = await supabase
    .rpc('get_organization_encryption_key', { org_id: orgId })

  // Encrypt using AES-256-GCM
  const encrypted = await encrypt(data, secrets.key)
  return encrypted
}
```

### 3. Access Control

#### Multi-Level Security

```
┌─────────────────────────────────────────────────┐
│ Super Admin (Platform Level)                    │
│ - NO access to learner PII                      │
│ - Aggregated/anonymized data only               │
│ - Organization metadata only                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Tenant Admin (Organization Level)               │
│ - Full access to their org's data               │
│ - User management                               │
│ - Cannot export PII without audit trail         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ End Users (Role-Based)                          │
│ - Access ONLY to reports assigned to their role │
│ - PowerBI RLS filters by organization           │
│ - No direct database access                     │
└─────────────────────────────────────────────────┘
```

#### Row Level Security (RLS)

**Supabase RLS Policies:**

```sql
-- Users can only see data from their organization
CREATE POLICY "organization_isolation" ON learners
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE auth.uid() = auth_user_id
    )
  );

-- Super admins CANNOT see learner PII
CREATE POLICY "super_admin_no_pii" ON learners
  FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE auth.uid() = auth_user_id
      AND is_super_admin = true
    )
  );

-- Audit all access to sensitive fields
CREATE POLICY "audit_sensitive_access" ON learners
  FOR SELECT
  USING (
    log_data_access(auth.uid(), 'learners', id)
  );
```

### 4. PowerBI Security

#### Embedded Security
- **App-Owns-Data** model (not User-Owns-Data)
- Generate embed tokens server-side only
- **15-minute token expiry**
- **Row-Level Security (RLS)** in PowerBI:
  ```dax
  [OrganizationID] = USERPRINCIPALNAME()
  ```

#### Data Gateway
- **Azure Data Gateway** in secure VNET
- No public internet access to databases
- IP whitelisting for connections

### 5. Data Storage & Separation

#### Database Architecture
```
Organizations are isolated at the data level:

┌──────────────────────────────────┐
│ Supabase Database                │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Organization A Data        │ │
│  │ (RLS: org_id = 'A')       │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Organization B Data        │ │
│  │ (RLS: org_id = 'B')       │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘

PowerBI Datasets (per organization):
┌────────────────────────────────┐
│ Fabric Workspace A             │
│ - Dedicated capacity           │
│ - Isolated from other orgs     │
└────────────────────────────────┘
```

**Important**: Each organization's PowerBI data should be in separate Fabric workspaces or use RLS

### 6. Audit Logging

#### What We Log
- **All data access** (who, what, when)
- **All data modifications** (CRUD operations)
- **Authentication events** (login, logout, failed attempts)
- **Permission changes** (role assignments, access grants)
- **Data exports** (reports, downloads)
- **AI query logs** (what questions were asked about data)

#### Log Retention
- **Security logs**: 7 years (DPA 2018 requirement)
- **Access logs**: 2 years minimum
- **Audit trails**: Immutable (write-only)

```sql
-- Audit trigger on sensitive tables
CREATE TRIGGER audit_learner_access
  AFTER SELECT ON learners
  FOR EACH ROW
  EXECUTE FUNCTION log_data_access();
```

### 7. Data Retention & Deletion

#### Retention Periods (GDPR Article 5)
- **Active learners**: Duration of apprenticeship + 6 years
- **Completed apprenticeships**: 6 years from completion
- **Withdrawn learners**: 3 years from withdrawal
- **Marketing data**: Until consent withdrawn

#### Right to Erasure (GDPR Article 17)
```typescript
// Hard delete with cascade
async function deleteAllLearnerData(learnerId: string) {
  // 1. Verify legal basis for deletion
  // 2. Anonymize in PowerBI datasets
  // 3. Delete from Supabase
  // 4. Purge backups after 30 days
  // 5. Notify all data processors
  // 6. Log deletion in audit trail
}
```

#### Anonymization for Analytics
```sql
-- Platform-level insights use anonymized data
CREATE VIEW platform_insights AS
SELECT
  -- No PII included
  anonymize_id(learner_id) as anonymous_id,
  age_band, -- Not exact age
  region, -- Not exact location
  standard_name,
  outcome
FROM learners;
```

### 8. Vulnerability Protection

#### Application Security
- **SQL Injection**: Parameterized queries only (Supabase handles)
- **XSS**: Content Security Policy (CSP) headers
- **CSRF**: SameSite cookies, CSRF tokens
- **Clickjacking**: X-Frame-Options: DENY
- **Rate Limiting**: 100 req/min per user, 1000 req/min per org

#### Authentication Security
- **Password Requirements**:
  - Minimum 12 characters
  - Complexity requirements
  - Breach detection (HaveIBeenPwned API)
- **MFA**: Required for Super Admin and Tenant Admin
- **Session Management**:
  - 8-hour session timeout
  - Secure, HTTPOnly cookies
  - Session invalidation on logout

#### API Security
```typescript
// Every API route checks authentication + authorization
export async function GET(request: Request) {
  // 1. Verify JWT token
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // 2. Check organization membership
  const { data: userOrg } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()

  // 3. Verify feature access (tier-based)
  if (!hasFeature(userOrg.tier, 'EXPORT_REPORTS')) {
    return new Response('Forbidden', { status: 403 })
  }

  // 4. Log access
  await logAuditEvent('REPORT_EXPORT', user.id, userOrg.organization_id)

  // 5. Return data (RLS automatically filters)
  return Response.json(data)
}
```

### 9. Data Processing Agreements (DPA)

#### Sub-Processors
All sub-processors must have DPAs in place:

1. **Supabase** (Database hosting)
   - Location: EU/UK regions only
   - DPA: Standard contractual clauses

2. **Microsoft Azure** (PowerBI, OpenAI)
   - Location: UK South or North Europe
   - DPA: Microsoft DPA

3. **Vercel** (Application hosting)
   - Location: EU/UK edge nodes
   - DPA: Vercel DPA

4. **Resend** (Email)
   - DPA: Required
   - No PII in emails (use secure links)

### 10. Incident Response

#### Data Breach Protocol
1. **Detection** (automated monitoring)
2. **Containment** (within 1 hour)
3. **Assessment** (severity, scope)
4. **Notification**:
   - ICO: Within 72 hours (DPA 2018)
   - Affected organizations: Within 24 hours
   - Data subjects: If high risk
5. **Remediation** (patch vulnerabilities)
6. **Post-incident review**

#### Breach Notification Template
```
Subject: DATA BREACH NOTIFICATION - Skills Intelligence System

We are writing to inform you of a data security incident...

Date of breach: [DATE]
Date discovered: [DATE]
Data affected: [DESCRIPTION]
Individuals affected: [NUMBER]
Actions taken: [REMEDIATION]
Further steps: [RECOMMENDATIONS]
```

### 11. Security Monitoring

#### Real-Time Alerts
- Unusual data access patterns
- Failed authentication attempts (>5 in 10 min)
- API rate limit violations
- Privilege escalation attempts
- Data export spikes

#### Regular Security Audits
- **Weekly**: Automated vulnerability scans
- **Monthly**: Access reviews (remove unused accounts)
- **Quarterly**: Penetration testing
- **Annually**: External security audit

### 12. Privacy by Design

#### Data Minimization
```typescript
// Only collect what's necessary
interface LearnerData {
  // Required for service delivery
  learner_id: string
  first_name: string
  last_name: string
  standard: string

  // Sensitive - encrypted
  ethnicity?: string // Optional
  disability?: string // Optional

  // NEVER store
  // ❌ passport_full_number (only last 4 digits)
  // ❌ credit_card_info (never needed)
  // ❌ biometric_data (never needed)
}
```

#### Privacy-First AI
- AI summaries **never include** PII
- AI models **never trained** on customer data
- AI queries **logged and auditable**
- AI insights **aggregated only**

```typescript
// Good AI prompt (no PII)
"Analyze trends in completion rates for Digital Support Technician standard"

// Bad AI prompt (contains PII)
"What is John Smith's completion status?" // ❌ NEVER DO THIS
```

### 13. Compliance Checklist

#### Pre-Launch
- [ ] DPA signed with all organizations
- [ ] Privacy Policy published and accessible
- [ ] Cookie consent banner implemented
- [ ] Data retention policies documented
- [ ] RLS policies tested and verified
- [ ] Audit logging enabled on all tables
- [ ] Encryption at rest verified
- [ ] TLS 1.3 enforced
- [ ] Penetration test completed
- [ ] ICO registration completed (if required)

#### Ongoing
- [ ] Regular security audits
- [ ] Annual penetration testing
- [ ] Quarterly access reviews
- [ ] Monthly vulnerability scans
- [ ] Data Protection Impact Assessment (DPIA) reviews
- [ ] Staff security training (annually)

### 14. Staff Training

#### All Staff Must Understand
- How to identify PII
- When to escalate security concerns
- Password security best practices
- Phishing awareness
- Data breach procedures

#### Developer Requirements
- Secure coding practices
- OWASP Top 10 awareness
- Supabase RLS policy creation
- Secrets management (never commit keys)

### 15. Configuration

#### Environment Variables (Never Commit!)
```bash
# .env.local (NEVER in git)
SUPABASE_SERVICE_ROLE_KEY=xxx # Admin key - never expose to client
POWERBI_CLIENT_SECRET=xxx
AZURE_OPENAI_API_KEY=xxx
ENCRYPTION_MASTER_KEY=xxx # For field-level encryption

# Only these go to client
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx # Anon key with RLS
```

#### Vercel Environment Variables
- Mark all secrets as "Encrypted"
- Never log environment variables
- Rotate keys every 90 days

---

## Emergency Contacts

**Data Protection Officer (DPO)**: [TO BE ASSIGNED]
**Security Team**: security@skillsintelligence.co.uk
**ICO**: casework@ico.org.uk | 0303 123 1113

---

## Summary

This platform handles **children's sensitive data** and must be treated with the highest level of security and compliance. Every design decision prioritizes data protection, privacy, and regulatory compliance.

**Remember**: When in doubt, ask "Would I be comfortable explaining this to the ICO?" If not, don't do it.
