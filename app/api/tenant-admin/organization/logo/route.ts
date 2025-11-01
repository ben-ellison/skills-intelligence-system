import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/organization-context';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgError } = await getOrganizationId(request, session.user.email);

    if (orgError || !organizationId) {
      return NextResponse.json({ error: orgError || 'Organization not found' }, { status: 404 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload a PNG, JPEG, SVG, or WebP image.'
      }, { status: 400 });
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 2MB.'
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}-${Date.now()}.${fileExt}`;
    const filePath = `organization-logos/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);

    const logoUrl = publicUrlData.publicUrl;

    // Update organization with logo URL
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
      logo_url: logoUrl
    });
  } catch (error) {
    console.error('Error in POST /api/tenant-admin/organization/logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is tenant admin or super admin
    if (!session.user.isTenantAdmin && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Tenant Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Get organization ID based on subdomain (for multi-tenant access)
    const { organizationId, error: orgIdError } = await getOrganizationId(request, session.user.email);

    if (orgIdError || !organizationId) {
      return NextResponse.json({ error: orgIdError || 'Organization not found' }, { status: 404 });
    }

    // Get current logo URL to delete from storage
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Delete from storage if exists
    if (org.logo_url) {
      // Extract file path from URL
      const urlParts = org.logo_url.split('/');
      const filePath = `organization-logos/${urlParts[urlParts.length - 1]}`;

      await supabase.storage
        .from('public-assets')
        .remove([filePath]);
    }

    // Remove logo URL from database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Logo removed successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/tenant-admin/organization/logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
