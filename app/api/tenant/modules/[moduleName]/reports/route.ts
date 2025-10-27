import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// GET /api/tenant/modules/[moduleName]/reports
// Get all reports for a specific module that the user has access to
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleName } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's organization and role (use email instead of sub)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id, role_id')
      .eq('email', session.user.email)
      .single();

    if (userError || !user?.organization_id || !user?.role_id) {
      return NextResponse.json(
        { error: 'User not properly configured' },
        { status: 404 }
      );
    }

    // Get the module ID for this organization
    const { data: module, error: moduleError } = await supabase
      .from('organization_modules')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('name', moduleName)
      .eq('is_active', true)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Module not found or not accessible' },
        { status: 404 }
      );
    }

    // Get reports assigned to this module AND role
    // This is a complex query that joins multiple tables
    const { data: reports, error: reportsError } = await supabase
      .rpc('get_user_reports_for_module', {
        p_organization_id: user.organization_id,
        p_module_id: module.id,
        p_role_id: user.role_id,
      });

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);

      // Fallback: manual query if RPC doesn't exist yet
      // Get report IDs from module_powerbi_reports
      const { data: moduleReports } = await supabase
        .from('module_powerbi_reports')
        .select('report_id')
        .eq('module_id', module.id)
        .eq('is_active', true);

      if (!moduleReports || moduleReports.length === 0) {
        return NextResponse.json([]);
      }

      const reportIds = moduleReports.map((mr) => mr.report_id);

      // Get report IDs that are also assigned to user's role
      const { data: roleReports } = await supabase
        .from('role_powerbi_reports')
        .select('report_id')
        .in('report_id', reportIds)
        .eq('role_id', user.role_id)
        .eq('is_active', true);

      if (!roleReports || roleReports.length === 0) {
        return NextResponse.json([]);
      }

      const allowedReportIds = roleReports.map((rr) => rr.report_id);

      // Get the actual organization reports
      const { data: orgReports, error: orgReportsError } = await supabase
        .from('organization_powerbi_reports')
        .select('id, powerbi_report_id, custom_display_name, powerbi_workspace_id')
        .eq('organization_id', user.organization_id)
        .in('template_report_id', allowedReportIds)
        .eq('deployment_status', 'active');

      if (orgReportsError) {
        console.error('Error fetching org reports:', orgReportsError);
        return NextResponse.json(
          { error: 'Failed to fetch reports' },
          { status: 500 }
        );
      }

      return NextResponse.json(orgReports || []);
    }

    return NextResponse.json(reports || []);
  } catch (error) {
    console.error('Error in GET reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
