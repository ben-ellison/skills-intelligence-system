require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createGlobalModulesTable() {
  try {
    console.log('🚀 Attempting to seed global modules...');

    // Try to insert the default modules
    const modules = [
      { name: 'senior-leader', display_name: 'Senior Leadership', icon_name: 'User', module_group: 'core', sort_order: 0, is_active: true },
      { name: 'operations', display_name: 'Operations', icon_name: 'Wrench', module_group: 'core', sort_order: 1, is_active: true },
      { name: 'quality', display_name: 'Quality & Curriculum', icon_name: 'CheckSquare', module_group: 'core', sort_order: 2, is_active: true },
      { name: 'compliance', display_name: 'Compliance', icon_name: 'FileText', module_group: 'core', sort_order: 3, is_active: true },
      { name: 'sales', display_name: 'Sales', icon_name: 'TrendingUp', module_group: 'core', sort_order: 4, is_active: true },
      { name: 'aaf', display_name: 'Accountability Framework', icon_name: 'BarChart3', module_group: 'analysis', sort_order: 5, is_active: true },
      { name: 'qar', display_name: 'QAR Information', icon_name: 'FileBarChart', module_group: 'analysis', sort_order: 6, is_active: true },
      { name: 'funding', display_name: 'Funding Information', icon_name: 'Coins', module_group: 'analysis', sort_order: 7, is_active: true }
    ];

    const { data, error } = await supabase
      .from('global_modules')
      .upsert(modules, { onConflict: 'name' })
      .select();

    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n⚠️  The global_modules table may not exist yet.');
      console.log('📋 Please run the migration manually:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Copy contents of: supabase/migrations/016_create_global_modules.sql');
      console.log('   3. Paste and run in SQL Editor');
      process.exit(1);
    }

    console.log('✅ Successfully seeded global modules!');
    console.log(`✓ Inserted/updated ${data.length} modules`);
    console.log('\nModules:');
    data.forEach(m => console.log(`  - ${m.display_name} (${m.name})`));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createGlobalModulesTable();
