import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prismaPrimary } from '../db/index.js';

// Adapter for Prisma with multi-schema support
// Uses the Session and User models from config schema (PRIMARY DB)
const adapter = new PrismaAdapter(prismaPrimary.session, prismaPrimary.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // Set to false for IP-based access without HTTPS
      // TODO: Set to true when using HTTPS with a domain
      secure: false,
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
      role: attributes.role,
    };
  },
});

// Type declarations for Lucia
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
  name: string;
  role: string;
}

