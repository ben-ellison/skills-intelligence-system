import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ name: 'Dashboard' });
    }

    const supabase = createAdminClient();

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', session.user.organizationId)
      .single();

    if (error || !organization) {
      console.error('Error fetching organization:', error);
      return NextResponse.json({ name: 'Dashboard' });
    }

    return NextResponse.json({ name: organization.name });
  } catch (error) {
    console.error('Error in organization API:', error);
    return NextResponse.json({ name: 'Dashboard' });
  }
}
