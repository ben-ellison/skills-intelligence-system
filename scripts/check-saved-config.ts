import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSavedConfig() {
  console.log('🔍 Checking saved configurations...\n');

  // Check module_powerbi_reports
  const { data: moduleReports, error: error1 } = await supabase
    .from('module_powerbi_reports')
    .select('*');

  console.log('Module-Report Assignments:', moduleReports?.length || 0);
  if (moduleReports && moduleReports.length > 0) {
    console.log('Samples:');
    moduleReports.slice(0, 3).forEach((mr, i) => {
      console.log(`  ${i + 1}.`, {
        id: mr.id,
        module_id: mr.module_id,
        report_id: mr.report_id,
        sort_order: mr.sort_order,
      });
    });
  }

  // Check role_powerbi_reports
  const { data: roleReports, error: error2 } = await supabase
    .from('role_powerbi_reports')
    .select('*');

  console.log('\nRole-Report Assignments:', roleReports?.length || 0);
  if (roleReports && roleReports.length > 0) {
    console.log('Samples:');
    roleReports.slice(0, 3).forEach((rr, i) => {
      console.log(`  ${i + 1}.`, {
        id: rr.id,
        role_id: rr.role_id,
        report_id: rr.report_id,
        can_view: rr.can_view,
      });
    });
  }

  if (moduleReports && moduleReports.length > 0 && roleReports && roleReports.length > 0) {
    console.log('\n✅ Configuration IS being saved successfully!');
    console.log('   The issue must be in how the UI displays the saved data.');
  } else {
    console.log('\n⚠️  No configurations found in database.');
  }
}

checkSavedConfig();
