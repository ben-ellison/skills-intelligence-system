import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and Super Admin status
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Fetch all integration presets
    const { data: presets, error: presetsError } = await supabase
      .from('integration_presets')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (presetsError) {
      console.error('Error fetching integration presets:', presetsError);
      return NextResponse.json(
        { error: 'Failed to fetch integration presets' },
        { status: 500 }
      );
    }

    // Fetch all integration providers
    const { data: providers, error: providersError } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (providersError) {
      console.error('Error fetching integration providers:', providersError);
      return NextResponse.json(
        { error: 'Failed to fetch integration providers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      presets: presets || [],
      providers: providers || [],
    });
  } catch (error) {
    console.error('Error in GET /api/super-admin/integration-presets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
