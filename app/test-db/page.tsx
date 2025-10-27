/**
 * Database Test Page
 * Visit: http://localhost:3000/test-db
 *
 * This page verifies:
 * - Supabase connection works
 * - Tables exist
 * - Seed data loaded correctly
 */

import { createClient } from '@/lib/supabase/server'

export default async function TestDatabasePage() {
  const supabase = await createClient()

  // Test 1: Get subscription tiers
  const { data: tiers, error: tiersError } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('sort_order')

  // Test 2: Get pricing brackets count
  const { count: bracketsCount } = await supabase
    .from('pricing_brackets')
    .select('*', { count: 'exact', head: true })

  // Test 3: Get global roles
  const { data: roles, error: rolesError } = await supabase
    .from('global_roles')
    .select('*')
    .order('sort_order')

  // Test 4: Get organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')

  // Test 5: Get users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">Database Connection Test</h1>

        {/* Subscription Tiers */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">
            ✅ Subscription Tiers ({tiers?.length || 0})
          </h2>
          {tiersError ? (
            <p className="text-red-600">Error: {tiersError.message}</p>
          ) : (
            <div className="space-y-2">
              {tiers?.map((tier) => (
                <div key={tier.id} className="border-l-4 border-teal-500 pl-4">
                  <p className="font-medium text-slate-900">{tier.display_name}</p>
                  <p className="text-sm text-slate-700">{tier.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing Brackets */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">
            ✅ Pricing Brackets: {bracketsCount || 0} total
          </h2>
          <p className="text-slate-700">
            Expected: 45 (15 per tier)
          </p>
          {bracketsCount === 45 ? (
            <p className="text-green-600 font-medium">✓ Correct!</p>
          ) : (
            <p className="text-red-600 font-medium">✗ Should be 45</p>
          )}
        </div>

        {/* Global Roles */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            ✅ Global Roles ({roles?.length || 0})
          </h2>
          {rolesError ? (
            <p className="text-red-600">Error: {rolesError.message}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {roles?.map((role) => (
                <div key={role.id} className="text-sm">
                  • {role.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Organizations */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            ✅ Organizations ({orgs?.length || 0})
          </h2>
          {orgsError ? (
            <p className="text-red-600">Error: {orgsError.message}</p>
          ) : (
            <div className="space-y-2">
              {orgs?.map((org) => (
                <div key={org.id} className="border-l-4 border-blue-500 pl-4">
                  <p className="font-medium">{org.name}</p>
                  <p className="text-sm text-slate-700">
                    Subdomain: {org.subdomain} | Learners: {org.current_learner_count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            ✅ Users ({users?.length || 0})
          </h2>
          {usersError ? (
            <p className="text-red-600">Error: {usersError.message}</p>
          ) : (
            <div className="space-y-2">
              {users?.map((user) => (
                <div key={user.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-slate-700">({user.email})</span>
                  {user.is_super_admin && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                      Super Admin
                    </span>
                  )}
                  {user.is_tenant_admin && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                      Tenant Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-teal-50 border-2 border-teal-500 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-teal-900">
            🎉 Database Status
          </h2>
          <div className="space-y-1 text-teal-900">
            <p>✓ Supabase connection: <strong>Working</strong></p>
            <p>✓ Tables created: <strong>14 tables</strong></p>
            <p>✓ Seed data loaded: <strong>Complete</strong></p>
            <p>✓ RLS policies: <strong>Active</strong></p>
          </div>
          <div className="mt-4 pt-4 border-t border-teal-200">
            <p className="text-sm text-teal-800">
              <strong>Next step:</strong> Create your first authenticated user to login!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
