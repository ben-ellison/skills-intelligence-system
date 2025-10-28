import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      dbId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isSuperAdmin?: boolean;
      isTenantAdmin?: boolean;
      organizationId?: string;
      roleId?: string;
      role?: string;
    };
  }

  interface User {
    isSuperAdmin?: boolean;
    isTenantAdmin?: boolean;
    organizationId?: string;
    roleId?: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isSuperAdmin?: boolean;
    isTenantAdmin?: boolean;
    organizationId?: string;
  }
}
