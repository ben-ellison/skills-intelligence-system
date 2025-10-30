import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import DatabaseSchemasWrapper from './page-wrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Database Schemas',
};


export default async function DatabaseSchemasPage() {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Check if user is a Super Admin
  if (!session.user?.isSuperAdmin) {
    redirect('/dashboard');
  }

  const supabase = createAdminClient();

  // Fetch all database schemas
  const { data: schemas } = await supabase
    .from('database_schemas')
    .select('*')
    .order('display_name', { ascending: true });

  // Fetch field mapping counts for each schema
  const { data: mappingCounts } = await supabase
    .from('schema_field_mappings')
    .select('schema_id')
    .eq('is_active', true);

  // Count mappings per schema
  const countsMap: Record<string, number> = {};
  mappingCounts?.forEach((mapping) => {
    countsMap[mapping.schema_id] = (countsMap[mapping.schema_id] || 0) + 1;
  });

  // Add counts to schemas
  const schemasWithCounts = (schemas || []).map((schema) => ({
    ...schema,
    mappingCount: countsMap[schema.id] || 0,
  }));

  return <DatabaseSchemasWrapper schemas={schemasWithCounts} />;
}
