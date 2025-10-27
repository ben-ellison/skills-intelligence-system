import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// This endpoint should be protected - only run during development/setup
export async function POST(request: Request) {
  const { authorization } = await request.json();

  // Simple protection - check for a secret key
  if (authorization !== 'MIGRATION_SECRET_KEY_2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results: any[] = [];

  const migrations = [
    '011_modules_and_features_schema.sql',
    '010_per_tenant_module_configuration.sql',
    '012_role_based_module_features.sql'
  ];

  try {
    for (const migration of migrations) {
      const migrationPath = path.join(process.cwd(), migration);

      if (!fs.existsSync(migrationPath)) {
        results.push({
          file: migration,
          status: 'error',
          error: 'File not found'
        });
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Split by semicolons and execute statement by statement
      // This is a simplification - proper SQL parsing would be better
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Running ${migration}: ${statements.length} statements`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];

        // Skip empty statements and comments
        if (!stmt || stmt.startsWith('--')) continue;

        try {
          // Use the supabase client to execute raw SQL
          // Note: This requires RLS to be disabled or proper permissions
          const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
            results.push({
              file: migration,
              statement: i + 1,
              status: 'error',
              error: error.message
            });
            // Continue with next statement
          }
        } catch (err: any) {
          console.error(`Exception in statement ${i + 1}:`, err);
          results.push({
            file: migration,
            statement: i + 1,
            status: 'error',
            error: err.message
          });
        }
      }

      results.push({
        file: migration,
        status: 'completed'
      });
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 });
  }
}
