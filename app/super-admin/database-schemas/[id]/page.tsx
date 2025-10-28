import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth-options';
import { createAdminClient } from '@/lib/supabase/server';
import SchemaDetailWrapper from './page-wrapper';

export default async function SchemaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Check if user is a Super Admin
  if (!session.user?.isSuperAdmin) {
    redirect('/dashboard');
  }

  const { id: schemaId } = await params;
  const supabase = createAdminClient();

  // Fetch schema details
  const { data: schema, error: schemaError } = await supabase
    .from('database_schemas')
    .select('*')
    .eq('id', schemaId)
    .single();

  if (schemaError || !schema) {
    redirect('/super-admin/database-schemas');
  }

  // Fetch field mappings for this schema
  const { data: mappings } = await supabase
    .from('schema_field_mappings')
    .select('*')
    .eq('schema_id', schemaId)
    .order('standard_field_label', { ascending: true });

  return (
    <SchemaDetailWrapper
      schema={schema}
      mappings={mappings || []}
    />
  );
}
