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
  debug: true,
  pages: {
    signOut: '/signout',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        token.sub = account.providerAccountId; // Auth0 user ID
        token.email = (profile as any).email;

        // Sync user to database
        const supabase = createAdminClient();
        try {
          // Try to find existing user by email first
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, auth0_user_id')
            .eq('email', token.email)
            .single();

          if (existingUser) {
            // User exists - update auth0_user_id if not set
            if (!existingUser.auth0_user_id) {
              await supabase
                .from('users')
                .update({
                  auth0_user_id: token.sub,
                  name: (profile as any).name || null,
                  activated_at: new Date().toISOString(),
                  status: 'active'
                })
                .eq('id', existingUser.id);
              console.log('Updated existing user with auth0_user_id:', token.email);
            }
          }
        } catch (error) {
          console.error('Error syncing user to database:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Add auth0 user ID to session
        session.user.sub = token.sub as string;

        // Enrich session with user data from Supabase
        const supabase = createAdminClient();

        try {
          const { data: user } = await supabase
            .from('users')
            .select('id, email, organization_id, is_super_admin, is_tenant_admin, primary_role_id')
            .eq('auth0_user_id', token.sub)
            .single();

          if (user) {
            session.user.id = user.id;
            session.user.email = user.email;
            session.user.organizationId = user.organization_id;
            session.user.isSuperAdmin = user.is_super_admin;
            session.user.isTenantAdmin = user.is_tenant_admin;
            session.user.roleId = user.primary_role_id;
            session.user.role = user.is_super_admin ? 'super-admin' : (user.is_tenant_admin ? 'tenant-admin' : 'user');

            // Update last_login_at timestamp (fire and forget)
            void supabase
              .from('users')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', user.id);
          }
        } catch (error) {
          console.error('Error enriching session:', error);
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle signout - redirect to signin page with a signed out message
      if (url.includes('/signout')) {
        return `${baseUrl}/signin?signedOut=true`;
      }

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
