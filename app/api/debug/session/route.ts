import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Return full session debug info
    return NextResponse.json({
      session,
      user: session.user,
      expires: session.expires,
    });
  } catch (error) {
    console.error('Error in debug session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
