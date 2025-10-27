import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/super-admin/organizations/[id]/reports/[reportId]/config
// Get current configuration for a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId, reportId } = await params;
    const supabase = createAdminClient();

    // Get the org report to find the template_report_id
    const { data: orgReport, error: orgReportError } = await supabase
      .from('organization_powerbi_reports')
      .select('template_report_id')
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (orgReportError || !orgReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get module assignments
    const { data: modules, error: modulesError } = await supabase
      .from('module_powerbi_reports')
      .select('module_id, sort_order')
      .eq('report_id', orgReport.template_report_id);

    // Get role assignments
    const { data: roles, error: rolesError } = await supabase
      .from('role_powerbi_reports')
      .select('role_id')
      .eq('report_id', orgReport.template_report_id);

    return NextResponse.json({
      modules: modules || [],
      roles: roles || [],
    });
  } catch (error) {
    console.error('Error in GET config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/organizations/[id]/reports/[reportId]/config
// Update configuration for a report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { id: organizationId, reportId } = await params;
    const body = await request.json();
    const { modules, roles } = body;

    const supabase = createAdminClient();

    // Get the org report to find the template_report_id
    const { data: orgReport, error: orgReportError } = await supabase
      .from('organization_powerbi_reports')
      .select('template_report_id')
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (orgReportError || !orgReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const templateReportId = orgReport.template_report_id;

    // Delete existing module assignments
    await supabase
      .from('module_powerbi_reports')
      .delete()
      .eq('report_id', templateReportId);

    // Delete existing role assignments
    await supabase
      .from('role_powerbi_reports')
      .delete()
      .eq('report_id', templateReportId);

    // Insert new module assignments
    if (modules && modules.length > 0) {
      const moduleInserts = modules.map((moduleId: string, index: number) => ({
        module_id: moduleId,
        report_id: templateReportId,
        sort_order: index,
        is_active: true,
      }));

      const { error: moduleInsertError } = await supabase
        .from('module_powerbi_reports')
        .insert(moduleInserts);

      if (moduleInsertError) {
        console.error('Error inserting module assignments:', moduleInsertError);
        return NextResponse.json(
          { error: 'Failed to assign modules' },
          { status: 500 }
        );
      }
    }

    // Insert new role assignments
    if (roles && roles.length > 0) {
      const roleInserts = roles.map((roleId: string) => ({
        role_id: roleId,
        report_id: templateReportId,
        is_active: true,
      }));

      const { error: roleInsertError } = await supabase
        .from('role_powerbi_reports')
        .insert(roleInserts);

      if (roleInsertError) {
        console.error('Error inserting role assignments:', roleInsertError);
        return NextResponse.json(
          { error: 'Failed to assign roles' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
