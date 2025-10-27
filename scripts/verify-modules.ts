import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyModules() {
  console.log('🔍 Verifying module initialization for Demo Training Provider...\n');

  // Get Demo Training Provider org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, subdomain, powerbi_workspace_id, powerbi_workspace_name')
    .eq('subdomain', 'demo1')
    .single();

  if (orgError || !org) {
    console.error('❌ Could not find Demo Training Provider');
    return;
  }

  console.log('✅ Organization Found:');
  console.log(`   Name: ${org.name}`);
  console.log(`   Subdomain: ${org.subdomain}`);
  console.log(`   PowerBI Workspace: ${org.powerbi_workspace_name || 'Not configured'}`);
  console.log(`   Workspace ID: ${org.powerbi_workspace_id || 'Not configured'}`);
  console.log('');

  // Check organization_modules
  const { data: orgModules, error: modulesError } = await supabase
    .from('organization_modules')
    .select('id, name, display_name, sort_order, is_active')
    .eq('organization_id', org.id)
    .order('sort_order');

  if (modulesError) {
    console.error('❌ Error fetching modules:', modulesError);
    return;
  }

  console.log(`📦 Organization Modules: ${orgModules?.length || 0} modules\n`);

  if (orgModules && orgModules.length > 0) {
    for (const mod of orgModules) {
      // Get features for this module
      const { data: features, error: featuresError } = await supabase
        .from('organization_module_features')
        .select('id, page_name_or_id, display_name, is_active')
        .eq('organization_module_id', mod.id);

      const featureCount = features?.length || 0;
      const activeIcon = mod.is_active ? '✅' : '❌';

      console.log(`${activeIcon} ${mod.display_name} (${mod.name})`);
      console.log(`   Features: ${featureCount}`);

      if (features && features.length > 0) {
        features.slice(0, 3).forEach(f => {
          console.log(`   - ${f.display_name || f.page_name_or_id}`);
        });
        if (features.length > 3) {
          console.log(`   ... and ${features.length - 3} more`);
        }
      }
      console.log('');
    }
  } else {
    console.log('⚠️  No modules found for this organization');
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`   Total Modules: ${orgModules?.length || 0}`);
  console.log(`   Active Modules: ${orgModules?.filter(m => m.is_active).length || 0}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (orgModules && orgModules.length === 14) {
    console.log('🎉 SUCCESS! All 14 modules initialized correctly!');
    console.log('\nNext step: Add PowerBI reports and map them to modules');
  } else {
    console.log('⚠️  Expected 14 modules but found', orgModules?.length || 0);
  }
}

verifyModules();
