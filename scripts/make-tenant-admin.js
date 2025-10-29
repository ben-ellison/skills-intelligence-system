// Quick script to make a user a tenant admin
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeTenantAdmin(email) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_tenant_admin: true })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('✅ User is now a tenant admin:', user.email);
    console.log('User ID:', user.id);
    console.log('Organization ID:', user.organization_id);
  } catch (err) {
    console.error('Error:', err);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/make-tenant-admin.js <email>');
  process.exit(1);
}

makeTenantAdmin(email);
