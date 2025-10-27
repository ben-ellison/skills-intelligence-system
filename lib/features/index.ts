/**
 * Feature Flag System
 *
 * Controls which features are available based on subscription tier.
 * This allows dynamic feature gating throughout the application.
 */

import { SUBSCRIPTION_TIERS, type TierName } from './tiers'

export const FEATURES = {
  // Core Features
  VIEW_REPORTS: 'view_reports',
  CUSTOM_BRANDING_BASIC: 'custom_branding_basic',
  CUSTOM_BRANDING_FULL: 'custom_branding_full',
  CUSTOM_BRANDING_WHITE_LABEL: 'custom_branding_white_label',
  UNLIMITED_USERS: 'unlimited_users',

  // AI Features (Intelligence tier only)
  AI_SUMMARY: 'ai_summary',
  AI_CHAT: 'ai_chat',
  AI_PREDICTIVE_ANALYTICS: 'ai_predictive_analytics',
  AI_CUSTOM_QUERIES: 'ai_custom_queries',

  // Advanced Features
  ADDITIONAL_REPORT_GRANTS: 'additional_report_grants',
  EXPORT_REPORTS: 'export_reports',
  API_ACCESS: 'api_access',
  CUSTOM_ROLES: 'custom_roles',
  SCHEDULED_REPORTS: 'scheduled_reports',

  // Support Levels
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_SUPPORT: 'dedicated_support',
} as const

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES]

/**
 * Check if a tier has access to a specific feature
 */
export function hasFeature(tierName: TierName, feature: FeatureKey): boolean {
  const tier = SUBSCRIPTION_TIERS[tierName]

  switch (feature) {
    case FEATURES.VIEW_REPORTS:
      return tier.features.viewReports

    case FEATURES.CUSTOM_BRANDING_BASIC:
      return ['basic', 'full', 'white_label'].includes(tier.features.customBranding)

    case FEATURES.CUSTOM_BRANDING_FULL:
      return ['full', 'white_label'].includes(tier.features.customBranding)

    case FEATURES.CUSTOM_BRANDING_WHITE_LABEL:
      return tier.features.customBranding === 'white_label'

    case FEATURES.UNLIMITED_USERS:
      return tier.features.unlimitedUsers

    case FEATURES.AI_SUMMARY:
      return tier.features.aiSummary

    case FEATURES.AI_CHAT:
      return tier.features.aiChat

    case FEATURES.AI_PREDICTIVE_ANALYTICS:
      return tier.features.aiPredictiveAnalytics

    case FEATURES.AI_CUSTOM_QUERIES:
      return tier.features.aiCustomQueries

    case FEATURES.ADDITIONAL_REPORT_GRANTS:
      return tier.features.additionalReportGrants

    case FEATURES.EXPORT_REPORTS:
      return tier.features.exportReports

    case FEATURES.API_ACCESS:
      return tier.features.apiAccess

    case FEATURES.CUSTOM_ROLES:
      return tier.features.customRoles

    case FEATURES.SCHEDULED_REPORTS:
      return tier.features.scheduledReports

    case FEATURES.PRIORITY_SUPPORT:
      return ['priority', 'dedicated'].includes(tier.features.supportLevel)

    case FEATURES.DEDICATED_SUPPORT:
      return tier.features.supportLevel === 'dedicated'

    default:
      return false
  }
}

/**
 * Get all features available for a tier
 */
export function getTierFeatures(tierName: TierName): FeatureKey[] {
  return Object.values(FEATURES).filter((feature) => hasFeature(tierName, feature))
}

/**
 * Check if any AI features are available
 */
export function hasAnyAIFeature(tierName: TierName): boolean {
  return (
    hasFeature(tierName, FEATURES.AI_SUMMARY) ||
    hasFeature(tierName, FEATURES.AI_CHAT) ||
    hasFeature(tierName, FEATURES.AI_PREDICTIVE_ANALYTICS) ||
    hasFeature(tierName, FEATURES.AI_CUSTOM_QUERIES)
  )
}

/**
 * Get upgrade message for a feature not available in current tier
 */
export function getUpgradeMessage(feature: FeatureKey): {
  title: string
  description: string
  requiredTier: TierName[]
} {
  const messages: Record<
    FeatureKey,
    { title: string; description: string; requiredTier: TierName[] }
  > = {
    [FEATURES.VIEW_REPORTS]: {
      title: 'Report Access',
      description: 'View PowerBI embedded reports',
      requiredTier: ['core', 'clarity', 'intelligence'],
    },
    [FEATURES.CUSTOM_BRANDING_BASIC]: {
      title: 'Basic Branding',
      description: 'Upload your logo and customize colors',
      requiredTier: ['core', 'clarity', 'intelligence'],
    },
    [FEATURES.CUSTOM_BRANDING_FULL]: {
      title: 'Full Branding',
      description: 'Complete customization of your dashboard appearance',
      requiredTier: ['clarity', 'intelligence'],
    },
    [FEATURES.CUSTOM_BRANDING_WHITE_LABEL]: {
      title: 'White Label',
      description: 'Remove all Skills Intelligence branding',
      requiredTier: ['intelligence'],
    },
    [FEATURES.UNLIMITED_USERS]: {
      title: 'Unlimited Users',
      description: 'Add as many users as you need',
      requiredTier: ['core', 'clarity', 'intelligence'],
    },
    [FEATURES.AI_SUMMARY]: {
      title: 'AI Summaries',
      description: 'Daily AI-generated strategic summaries of your data',
      requiredTier: ['intelligence'],
    },
    [FEATURES.AI_CHAT]: {
      title: 'AI Chat',
      description: 'Conversational AI to answer questions about your data',
      requiredTier: ['intelligence'],
    },
    [FEATURES.AI_PREDICTIVE_ANALYTICS]: {
      title: 'Predictive Analytics',
      description: 'AI-powered forecasts and risk predictions',
      requiredTier: ['intelligence'],
    },
    [FEATURES.AI_CUSTOM_QUERIES]: {
      title: 'Custom AI Queries',
      description: 'Ask complex questions and get AI-analyzed insights',
      requiredTier: ['intelligence'],
    },
    [FEATURES.ADDITIONAL_REPORT_GRANTS]: {
      title: 'Additional Report Access',
      description: 'Grant users access to reports beyond their role',
      requiredTier: ['clarity', 'intelligence'],
    },
    [FEATURES.EXPORT_REPORTS]: {
      title: 'Export Reports',
      description: 'Download reports as PDF or Excel',
      requiredTier: ['clarity', 'intelligence'],
    },
    [FEATURES.API_ACCESS]: {
      title: 'API Access',
      description: 'Programmatic access to your data via REST API',
      requiredTier: ['intelligence'],
    },
    [FEATURES.CUSTOM_ROLES]: {
      title: 'Custom Roles',
      description: 'Create custom roles beyond standard templates',
      requiredTier: ['intelligence'],
    },
    [FEATURES.SCHEDULED_REPORTS]: {
      title: 'Scheduled Reports',
      description: 'Automatically email reports on a schedule',
      requiredTier: ['clarity', 'intelligence'],
    },
    [FEATURES.PRIORITY_SUPPORT]: {
      title: 'Priority Support',
      description: 'Faster response times and priority queue',
      requiredTier: ['clarity', 'intelligence'],
    },
    [FEATURES.DEDICATED_SUPPORT]: {
      title: 'Dedicated Support',
      description: 'Your own dedicated account manager',
      requiredTier: ['intelligence'],
    },
  }

  return messages[feature]
}
