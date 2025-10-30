const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ytknzkfdyvuwazoigisd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0a256a2ZkeXZ1d2F6b2lnaXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE3ODc5NSwiZXhwIjoyMDc2NzU0Nzk1fQ.gDaFVCOAL1hcgvCQlL3o3Jz8nkzEEe4YhJsFP6ISsdM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTabs() {
  const { data: globalModule } = await supabase
    .from('global_modules')
    .select('id, name')
    .eq('name', 'Quality & Curriculum')
    .single();

  console.log('Global Module:', globalModule);

  if (globalModule) {
    const { data: tabs } = await supabase
      .from('global_module_tabs')
      .select('*')
      .eq('global_module_id', globalModule.id)
      .order('sort_order');

    console.log('\nGlobal Module Tabs:');
    tabs.forEach(tab => {
      console.log(`  [${tab.sort_order}] ${tab.tab_name}`);
    });
  }
}

checkTabs();
