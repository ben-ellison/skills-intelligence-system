/**
 * PowerBI Report Provider Code Matching System
 *
 * Intelligently matches PowerBI report templates to organizations
 * based on their provider configuration codes.
 *
 * Example: Organization with Aptem + BKSB + HubSpot matches
 * reports with "APTEM-BKSB-HUBSPOT" in their name.
 */

import { createClient } from '@/lib/supabase/server';

export interface ProviderCodes {
  lms?: string;
  englishMaths?: string;
  crm?: string;
  hr?: string;
}

export interface ParsedReport {
  providerCode?: string;
  lmsCode?: string;
  englishMathsCode?: string;
  crmCode?: string;
  hrCode?: string;
  roleName?: string;
  version?: string;
}

export interface MatchingReport {
  id: string;
  name: string;
  category: string;
  providerCode?: string;
  matchType: 'exact_match' | 'core_match' | 'partial_match' | 'lms_only' | 'universal' | 'no_match';
  matchScore: number;
  lmsCode?: string;
  englishMathsCode?: string;
  crmCode?: string;
  hrCode?: string;
  roleName?: string;
  version?: string;
}

/**
 * Known provider codes by category
 */
export const KNOWN_PROVIDER_CODES = {
  lms: ['APTEM', 'BUD', 'ONEFILE'],
  englishMaths: ['BKSB', 'FUNC', 'SMARTASSESSOR'],
  crm: ['HUBSPOT', 'SF', 'DYNAMICS', 'ZOHO'],
  hr: ['SAGEHR', 'BAMBOOHR'],
} as const;

/**
 * Parse a report name to extract provider codes and metadata
 *
 * Example inputs:
 * - "APTEM-BKSB-HUBSPOT - Operations Leader v1.2"
 * - "BUD-FUNC-SF - Senior Leader v2.0"
 * - "ONEFILE - Immediate Priorities v1.5"
 * - "Universal Dashboard v1.0" (no provider codes)
 */
export function parseReportName(reportName: string): ParsedReport {
  const parsed: ParsedReport = {};

  if (!reportName || reportName.trim() === '') {
    return parsed;
  }

  // Split by " - " to separate provider codes from role name
  const parts = reportName.split(' - ');

  if (parts.length >= 1) {
    const codePart = parts[0].trim();
    parsed.providerCode = codePart;

    // Extract individual provider codes
    const providerParts = codePart.split('-').map(p => p.trim().toUpperCase());

    for (const code of providerParts) {
      // Check each known category
      if (KNOWN_PROVIDER_CODES.lms.includes(code as any)) {
        parsed.lmsCode = code;
      } else if (KNOWN_PROVIDER_CODES.englishMaths.includes(code as any)) {
        parsed.englishMathsCode = code;
      } else if (KNOWN_PROVIDER_CODES.crm.includes(code as any)) {
        parsed.crmCode = code;
      } else if (KNOWN_PROVIDER_CODES.hr.includes(code as any)) {
        parsed.hrCode = code;
      }
    }
  }

  // Extract role name and version
  if (parts.length >= 2) {
    const rolePart = parts[1].trim();

    // Extract version (e.g., "v1.2" or "1.2")
    const versionMatch = rolePart.match(/v?(\d+\.\d+)\s*$/);

    if (versionMatch) {
      parsed.version = versionMatch[1];
      // Remove version from role name
      parsed.roleName = rolePart.replace(/\s*v?\d+\.\d+\s*$/, '').trim();
    } else {
      parsed.roleName = rolePart;
    }
  }

  return parsed;
}

/**
 * Build provider code string from organization's provider configuration
 */
export function buildProviderCode(codes: ProviderCodes): string {
  const parts: string[] = [];

  if (codes.lms) parts.push(codes.lms);
  if (codes.englishMaths) parts.push(codes.englishMaths);
  if (codes.crm) parts.push(codes.crm);
  if (codes.hr) parts.push(codes.hr);

  return parts.join('-');
}

/**
 * Calculate match score between report and organization
 *
 * Scoring:
 * - 100: Exact match (all providers including HR)
 * - 90: Core match (LMS + E&M + CRM, no HR)
 * - 70: Partial match (LMS + E&M)
 * - 50: LMS only
 * - 0: No match
 */
export function calculateMatchScore(
  reportCodes: ParsedReport,
  orgCodes: ProviderCodes
): number {
  // Universal reports (no provider codes) get scored separately
  if (!reportCodes.lmsCode && !reportCodes.englishMathsCode &&
      !reportCodes.crmCode && !reportCodes.hrCode) {
    return 25; // Universal reports are always available but lower priority
  }

  let score = 0;
  let matches = 0;
  let required = 0;

  // Check LMS
  if (reportCodes.lmsCode) {
    required++;
    if (reportCodes.lmsCode === orgCodes.lms) {
      matches++;
      score += 40;
    }
  }

  // Check English & Maths
  if (reportCodes.englishMathsCode) {
    required++;
    if (reportCodes.englishMathsCode === orgCodes.englishMaths) {
      matches++;
      score += 25;
    }
  }

  // Check CRM
  if (reportCodes.crmCode) {
    required++;
    if (reportCodes.crmCode === orgCodes.crm) {
      matches++;
      score += 25;
    }
  }

  // Check HR (optional, bonus points)
  if (reportCodes.hrCode) {
    if (reportCodes.hrCode === orgCodes.hr) {
      score += 10;
    }
  }

  // Only return score if all required fields match
  if (matches === required && required > 0) {
    return score;
  }

  return 0;
}

/**
 * Determine match type based on which providers match
 */
export function getMatchType(
  reportCodes: ParsedReport,
  orgCodes: ProviderCodes
): MatchingReport['matchType'] {
  // Universal reports
  if (!reportCodes.lmsCode && !reportCodes.englishMathsCode &&
      !reportCodes.crmCode && !reportCodes.hrCode) {
    return 'universal';
  }

  const lmsMatch = reportCodes.lmsCode === orgCodes.lms;
  const emMatch = reportCodes.englishMathsCode === orgCodes.englishMaths;
  const crmMatch = reportCodes.crmCode === orgCodes.crm;
  const hrMatch = reportCodes.hrCode === orgCodes.hr;

  // Check for exact match
  if (lmsMatch && emMatch && crmMatch && hrMatch && reportCodes.hrCode) {
    return 'exact_match';
  }

  // Core match (LMS + E&M + CRM)
  if (lmsMatch && emMatch && crmMatch && !reportCodes.hrCode) {
    return 'core_match';
  }

  // Partial match (LMS + E&M)
  if (lmsMatch && emMatch && !reportCodes.crmCode) {
    return 'partial_match';
  }

  // LMS only
  if (lmsMatch && !reportCodes.englishMathsCode && !reportCodes.crmCode) {
    return 'lms_only';
  }

  return 'no_match';
}

/**
 * Get organization's provider codes from database
 */
export async function getOrganizationProviderCodes(
  organizationId: string
): Promise<ProviderCodes> {
  const supabase = await createClient();

  // Get organization with its provider relationships
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(`
      lms_provider_id,
      english_maths_provider_id,
      crm_provider_id,
      hr_provider_id
    `)
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    throw new Error(`Failed to fetch organization: ${orgError?.message}`);
  }

  // Get provider codes
  const providerIds = [
    org.lms_provider_id,
    org.english_maths_provider_id,
    org.crm_provider_id,
    org.hr_provider_id,
  ].filter(Boolean);

  if (providerIds.length === 0) {
    return {};
  }

  const { data: providers, error: provError } = await supabase
    .from('integration_providers')
    .select('id, code, category')
    .in('id', providerIds);

  if (provError || !providers) {
    throw new Error(`Failed to fetch providers: ${provError?.message}`);
  }

  const codes: ProviderCodes = {};

  for (const provider of providers) {
    switch (provider.category) {
      case 'lms':
        codes.lms = provider.code;
        break;
      case 'english_maths':
        codes.englishMaths = provider.code;
        break;
      case 'crm':
        codes.crm = provider.code;
        break;
      case 'hr':
        codes.hr = provider.code;
        break;
    }
  }

  return codes;
}

/**
 * Find all matching report templates for an organization
 */
export async function findMatchingReportsForOrganization(
  organizationId: string
): Promise<MatchingReport[]> {
  const supabase = await createClient();

  // Get organization's provider codes
  const orgCodes = await getOrganizationProviderCodes(organizationId);

  // Get all template reports
  const { data: reports, error } = await supabase
    .from('powerbi_reports')
    .select('*')
    .eq('is_template', true)
    .eq('is_active', true);

  if (error || !reports) {
    throw new Error(`Failed to fetch reports: ${error?.message}`);
  }

  // Score and filter reports
  const matchingReports: MatchingReport[] = reports
    .map((report) => {
      const reportCodes: ParsedReport = {
        providerCode: report.provider_code,
        lmsCode: report.lms_code,
        englishMathsCode: report.english_maths_code,
        crmCode: report.crm_code,
        hrCode: report.hr_code,
        roleName: report.role_name,
        version: report.report_version,
      };

      const matchScore = calculateMatchScore(reportCodes, orgCodes);
      const matchType = getMatchType(reportCodes, orgCodes);

      return {
        id: report.id,
        name: report.name,
        category: report.category,
        providerCode: report.provider_code,
        matchType,
        matchScore,
        lmsCode: report.lms_code,
        englishMathsCode: report.english_maths_code,
        crmCode: report.crm_code,
        hrCode: report.hr_code,
        roleName: report.role_name,
        version: report.report_version,
      };
    })
    .filter((report) => report.matchScore > 0) // Only include matches
    .sort((a, b) => {
      // Sort by score (descending), then by category, then by name
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

  return matchingReports;
}

/**
 * Check if a report is already deployed to an organization
 */
export async function isReportDeployed(
  organizationId: string,
  templateReportId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_powerbi_reports')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('template_report_id', templateReportId)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}

/**
 * Get deployment statistics for an organization
 */
export async function getDeploymentStats(organizationId: string) {
  const supabase = await createClient();

  const [matchingReports, { count: deployedCount }] = await Promise.all([
    findMatchingReportsForOrganization(organizationId),
    supabase
      .from('organization_powerbi_reports')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
  ]);

  return {
    totalMatching: matchingReports.length,
    deployed: deployedCount || 0,
    pending: matchingReports.length - (deployedCount || 0),
    matchingReports,
  };
}
