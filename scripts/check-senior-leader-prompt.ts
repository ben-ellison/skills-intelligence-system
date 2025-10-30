import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrompt() {
  console.log('Checking Senior Leader AI prompt configuration...\n');

  // Get Senior Leader role
  const { data: role } = await supabase
    .from('global_roles')
    .select('id, name, display_name')
    .eq('name', 'senior_leader')
    .single();

  console.log('Senior Leader Role:', role);

  if (!role) {
    console.log('❌ Senior Leader role not found!');
    return;
  }

  // Get AI prompt for Senior Leader
  const { data: prompt, error } = await supabase
    .from('ai_prompts')
    .select(`
      *,
      powerbi_reports:powerbi_report_id (
        id,
        name,
        powerbi_report_id,
        powerbi_workspace_id
      )
    `)
    .eq('role_id', role.id)
    .eq('prompt_type', 'daily_summary')
    .single();

  if (error) {
    console.log('❌ Error fetching prompt:', error);
    return;
  }

  console.log('\nSenior Leader AI Prompt:');
  console.log('- Prompt Name:', prompt.prompt_name);
  console.log('- Is Active:', prompt.is_active);
  console.log('- PowerBI Report ID:', prompt.powerbi_report_id);
  console.log('- PowerBI Page Names:', prompt.powerbi_page_names);
  console.log('- Report Details:', prompt.powerbi_reports);

  if (!prompt.powerbi_report_id) {
    console.log('\n⚠️  WARNING: No PowerBI report configured!');
    console.log('This is why the AI summary is not getting real data.');
    console.log('\nYou need to:');
    console.log('1. Go to Super Admin → AI Settings');
    console.log('2. Edit "Daily Summary for Senior Leader"');
    console.log('3. Select the report and pages');
    console.log('4. Click Save');
  } else if (!prompt.powerbi_page_names || prompt.powerbi_page_names.length === 0) {
    console.log('\n⚠️  WARNING: No pages selected!');
    console.log('The report is configured but no specific pages are selected.');
  } else {
    console.log('\n✅ Configuration looks good!');
    console.log('The API should be able to fetch data from these pages.');
  }
}

checkPrompt().catch(console.error);
