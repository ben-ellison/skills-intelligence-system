import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createClient } from '@supabase/supabase-js';

// GET /api/tenant/modules
// Get all modules available to the current user's organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log('GET /api/tenant/modules - Session:', session?.user?.email);

    if (!session || !session.user?.email) {
      console.log('No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Use email to find user instead of sub (which might be undefined)
    console.log('Looking for user with email:', session.user.email);

    // Get user's organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id, role_id, auth0_user_id')
      .eq('email', session.user.email)
      .single();

    console.log('User query result:', { user, error: userError });

    if (userError || !user?.organization_id) {
      console.log('User not found or no organization');
      return NextResponse.json(
        { error: 'User organization not found', details: userError },
        { status: 404 }
      );
    }

    // Get active modules for this organization
    const { data: modules, error: modulesError } = await supabase
      .from('organization_modules')
      .select('id, name, display_name, sort_order, icon')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    return NextResponse.json(modules || []);
  } catch (error) {
    console.error('Error in GET /api/tenant/modules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
