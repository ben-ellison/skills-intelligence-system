/**
 * Subscription Tiers for Skills Intelligence System
 *
 * Pricing is based on learner count brackets:
 * - Core: Up to 150 learners = £499/month
 * - Clarity: 151-350 learners = £899/month
 * - Intelligence: 151-350 learners = £1,199/month
 *
 * Each tier has different feature access.
 */

export type TierName = 'core' | 'clarity' | 'intelligence'

export interface PricingBracket {
  minLearners: number
  maxLearners: number | null // null = unlimited
  monthlyPrice: number
  yearlyPrice: number // Usually ~20% discount (10 months for price of 12)
}

export interface TierFeatures {
  // Core Features
  viewReports: boolean
  customBranding: 'none' | 'basic' | 'full' | 'white_label'
  unlimitedUsers: boolean

  // AI Features (Intelligence tier only)
  aiSummary: boolean
  aiChat: boolean
  aiPredictiveAnalytics: boolean
  aiCustomQueries: boolean

  // Advanced Features
  additionalReportGrants: boolean
  exportReports: boolean
  apiAccess: boolean
  customRoles: boolean
  scheduledReports: boolean

  // Data & Storage
  dataRetentionYears: number

  // Support
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
}

export interface SubscriptionTier {
  id: TierName
  name: string
  displayName: string
  description: string
  pricingBrackets: PricingBracket[]
  features: TierFeatures
  isPopular?: boolean
}

export const SUBSCRIPTION_TIERS: Record<TierName, SubscriptionTier> = {
  core: {
    id: 'core',
    name: 'Core',
    displayName: 'Core',
    description: 'Essential reporting and analytics for small training providers',
    pricingBrackets: [
      { minLearners: 0, maxLearners: 150, monthlyPrice: 399, yearlyPrice: 3990 },
      { minLearners: 151, maxLearners: 200, monthlyPrice: 499, yearlyPrice: 4990 },
      { minLearners: 201, maxLearners: 350, monthlyPrice: 599, yearlyPrice: 5990 },
      { minLearners: 351, maxLearners: 500, monthlyPrice: 749, yearlyPrice: 7490 },
      { minLearners: 501, maxLearners: 750, monthlyPrice: 899, yearlyPrice: 8990 },
      { minLearners: 751, maxLearners: 1000, monthlyPrice: 1099, yearlyPrice: 10990 },
      { minLearners: 1001, maxLearners: 1250, monthlyPrice: 1299, yearlyPrice: 12990 },
      { minLearners: 1251, maxLearners: 1500, monthlyPrice: 1499, yearlyPrice: 14990 },
      { minLearners: 1501, maxLearners: 2000, monthlyPrice: 1799, yearlyPrice: 17990 },
      { minLearners: 2001, maxLearners: 3000, monthlyPrice: 2299, yearlyPrice: 22990 },
      { minLearners: 3001, maxLearners: 5000, monthlyPrice: 3299, yearlyPrice: 32990 },
      { minLearners: 5001, maxLearners: 7500, monthlyPrice: 4799, yearlyPrice: 47990 },
      { minLearners: 7501, maxLearners: 10000, monthlyPrice: 6499, yearlyPrice: 64990 },
      { minLearners: 10001, maxLearners: 12500, monthlyPrice: 7999, yearlyPrice: 79990 },
      { minLearners: 12501, maxLearners: null, monthlyPrice: 9999, yearlyPrice: 99990 },
    ],
    features: {
      viewReports: true,
      customBranding: 'basic',
      unlimitedUsers: true,
      aiSummary: false,
      aiChat: false,
      aiPredictiveAnalytics: false,
      aiCustomQueries: false,
      additionalReportGrants: false,
      exportReports: false,
      apiAccess: false,
      customRoles: false,
      scheduledReports: false,
      dataRetentionYears: 1,
      supportLevel: 'email',
    },
  },

  clarity: {
    id: 'clarity',
    name: 'Clarity',
    displayName: 'Clarity',
    description: 'Advanced analytics and customization for growing providers',
    pricingBrackets: [
      { minLearners: 0, maxLearners: 150, monthlyPrice: 599, yearlyPrice: 5990 },
      { minLearners: 151, maxLearners: 200, monthlyPrice: 699, yearlyPrice: 6990 },
      { minLearners: 201, maxLearners: 350, monthlyPrice: 799, yearlyPrice: 7990 },
      { minLearners: 351, maxLearners: 500, monthlyPrice: 999, yearlyPrice: 9990 },
      { minLearners: 501, maxLearners: 750, monthlyPrice: 1199, yearlyPrice: 11990 },
      { minLearners: 751, maxLearners: 1000, monthlyPrice: 1449, yearlyPrice: 14490 },
      { minLearners: 1001, maxLearners: 1250, monthlyPrice: 1699, yearlyPrice: 16990 },
      { minLearners: 1251, maxLearners: 1500, monthlyPrice: 1949, yearlyPrice: 19490 },
      { minLearners: 1501, maxLearners: 2000, monthlyPrice: 2399, yearlyPrice: 23990 },
      { minLearners: 2001, maxLearners: 3000, monthlyPrice: 3199, yearlyPrice: 31990 },
      { minLearners: 3001, maxLearners: 5000, monthlyPrice: 4699, yearlyPrice: 46990 },
      { minLearners: 5001, maxLearners: 7500, monthlyPrice: 6899, yearlyPrice: 68990 },
      { minLearners: 7501, maxLearners: 10000, monthlyPrice: 9499, yearlyPrice: 94990 },
      { minLearners: 10001, maxLearners: 12500, monthlyPrice: 11999, yearlyPrice: 119990 },
      { minLearners: 12501, maxLearners: null, monthlyPrice: 14999, yearlyPrice: 149990 },
    ],
    features: {
      viewReports: true,
      customBranding: 'full',
      unlimitedUsers: true,
      aiSummary: false,
      aiChat: false,
      aiPredictiveAnalytics: false,
      aiCustomQueries: false,
      additionalReportGrants: true,
      exportReports: true,
      apiAccess: false,
      customRoles: false,
      scheduledReports: true,
      dataRetentionYears: 2,
      supportLevel: 'priority',
    },
    isPopular: true,
  },

  intelligence: {
    id: 'intelligence',
    name: 'Intelligence',
    displayName: 'Intelligence',
    description: 'Full AI-powered insights and predictive analytics',
    pricingBrackets: [
      { minLearners: 0, maxLearners: 150, monthlyPrice: 899, yearlyPrice: 8990 },
      { minLearners: 151, maxLearners: 200, monthlyPrice: 999, yearlyPrice: 9990 },
      { minLearners: 201, maxLearners: 350, monthlyPrice: 1199, yearlyPrice: 11990 },
      { minLearners: 351, maxLearners: 500, monthlyPrice: 1499, yearlyPrice: 14990 },
      { minLearners: 501, maxLearners: 750, monthlyPrice: 1799, yearlyPrice: 17990 },
      { minLearners: 751, maxLearners: 1000, monthlyPrice: 2199, yearlyPrice: 21990 },
      { minLearners: 1001, maxLearners: 1250, monthlyPrice: 2599, yearlyPrice: 25990 },
      { minLearners: 1251, maxLearners: 1500, monthlyPrice: 2999, yearlyPrice: 29990 },
      { minLearners: 1501, maxLearners: 2000, monthlyPrice: 3699, yearlyPrice: 36990 },
      { minLearners: 2001, maxLearners: 3000, monthlyPrice: 4999, yearlyPrice: 49990 },
      { minLearners: 3001, maxLearners: 5000, monthlyPrice: 7499, yearlyPrice: 74990 },
      { minLearners: 5001, maxLearners: 7500, monthlyPrice: 10999, yearlyPrice: 109990 },
      { minLearners: 7501, maxLearners: 10000, monthlyPrice: 14999, yearlyPrice: 149990 },
      { minLearners: 10001, maxLearners: 12500, monthlyPrice: 18999, yearlyPrice: 189990 },
      { minLearners: 12501, maxLearners: null, monthlyPrice: 24999, yearlyPrice: 249990 },
    ],
    features: {
      viewReports: true,
      customBranding: 'white_label',
      unlimitedUsers: true,
      aiSummary: true,
      aiChat: true,
      aiPredictiveAnalytics: true,
      aiCustomQueries: true,
      additionalReportGrants: true,
      exportReports: true,
      apiAccess: true,
      customRoles: true,
      scheduledReports: true,
      dataRetentionYears: 999, // Unlimited
      supportLevel: 'dedicated',
    },
  },
}

/**
 * Calculate the appropriate price for an organization based on learner count
 */
export function calculatePrice(
  tierName: TierName,
  learnerCount: number,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): number {
  const tier = SUBSCRIPTION_TIERS[tierName]
  const bracket = tier.pricingBrackets.find(
    (b) =>
      learnerCount >= b.minLearners &&
      (b.maxLearners === null || learnerCount <= b.maxLearners)
  )

  if (!bracket) {
    throw new Error(`No pricing bracket found for ${learnerCount} learners in ${tierName} tier`)
  }

  return billingCycle === 'monthly' ? bracket.monthlyPrice : bracket.yearlyPrice
}

/**
 * Get the pricing bracket for a given learner count
 */
export function getPricingBracket(
  tierName: TierName,
  learnerCount: number
): PricingBracket | undefined {
  const tier = SUBSCRIPTION_TIERS[tierName]
  return tier.pricingBrackets.find(
    (b) =>
      learnerCount >= b.minLearners &&
      (b.maxLearners === null || learnerCount <= b.maxLearners)
  )
}

/**
 * Format pricing bracket as a string (e.g., "0-150 learners")
 */
export function formatPricingBracket(bracket: PricingBracket): string {
  if (bracket.maxLearners === null) {
    return `${bracket.minLearners}+ learners`
  }
  return `${bracket.minLearners}-${bracket.maxLearners} learners`
}

/**
 * Get all available tiers as an array
 */
export function getAllTiers(): SubscriptionTier[] {
  return Object.values(SUBSCRIPTION_TIERS)
}
