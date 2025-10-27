import { NextAuthOptions } from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';
import { createAdminClient } from '@/lib/supabase/server';

export const authOptions: NextAuthOptions = {
  providers: [
    Auth0Provider({
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER_BASE_URL || `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}`,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Sync user to Supabase on first login or update
      if (account && user) {
        try {
          const supabase = createAdminClient();

          // Check if user exists by email first (to handle existing users)
          const { data: existingUsers } = await supabase
            .from('users')
            .select('id, auth0_user_id, is_super_admin, is_tenant_admin')
            .eq('email', user.email);

          if (existingUsers && existingUsers.length > 0) {
            // Update existing user with Auth0 ID if not set
            const existingUser = existingUsers[0];
            if (!existingUser.auth0_user_id) {
              await supabase
                .from('users')
                .update({
                  auth0_user_id: account.providerAccountId,
                  full_name: user.name || user.email,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingUser.id);

              console.log('Linked existing user to Auth0:', user.email);
            } else {
              console.log('User already linked:', user.email);
            }
          } else {
            // Create new user in Supabase (first time login)
            await supabase.from('users').insert({
              auth0_user_id: account.providerAccountId,
              email: user.email,
              full_name: user.name || user.email,
              is_super_admin: false,
              is_tenant_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            console.log('Created new user in Supabase:', user.email);
          }
        } catch (error) {
          console.error('Error syncing user to Supabase:', error);
          // Don't block login if sync fails
        }
      }

      return true;
    },
    async session({ session, token }) {
      // Add Auth0 user ID to session
      if (token.sub) {
        session.user.id = token.sub;
      }

      // Fetch user roles from Supabase
      try {
        const supabase = createAdminClient();
        console.log('Fetching roles for Auth0 ID:', token.sub);

        const { data: userData, error } = await supabase
          .from('users')
          .select('id, is_super_admin, is_tenant_admin, organization_id')
          .eq('auth0_user_id', token.sub)
          .single();

        if (error) {
          console.error('Supabase error:', error);
        }

        console.log('User data from DB:', userData);

        if (userData) {
          session.user.dbId = userData.id;
          session.user.isSuperAdmin = userData.is_super_admin;
          session.user.isTenantAdmin = userData.is_tenant_admin;
          session.user.organizationId = userData.organization_id;
          console.log('Session updated with roles:', {
            isSuperAdmin: userData.is_super_admin,
            isTenantAdmin: userData.is_tenant_admin
          });
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};
