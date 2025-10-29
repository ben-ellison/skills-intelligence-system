import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Create system_settings table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          powerbi_master_workspace_id TEXT,
          powerbi_master_workspace_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow service role full access to system_settings" ON system_settings;
        CREATE POLICY "Allow service role full access to system_settings"
          ON system_settings
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);

        INSERT INTO system_settings (powerbi_master_workspace_id, powerbi_master_workspace_name)
        VALUES (null, null)
        ON CONFLICT DO NOTHING;
      `
    });

    if (createError) {
      console.error('Migration error:', createError);

      // If exec_sql doesn't exist, try direct table creation
      const { error: directError } = await supabase
        .from('system_settings')
        .select('id')
        .limit(1);

      if (directError && directError.code === '42P01') {
        // Table doesn't exist, but we can't create it via RPC
        // Try inserting into a non-existent table to trigger creation
        return NextResponse.json(
          {
            error: 'Migration failed. Please run the SQL migration manually in Supabase SQL Editor.',
            details: 'Copy the contents of supabase/migrations/022_create_system_settings.sql'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
