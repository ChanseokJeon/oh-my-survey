import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, ensureDbReady, currentProvider } from "./db";
import { getPGliteInstance } from "./db/providers";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { eq } from "drizzle-orm";

// Build providers array conditionally
const providers: NextAuthConfig['providers'] = [];

// Only add Google if credentials are valid (not test values)
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_ID.includes('test')
) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Helper: Find or create user via PGlite raw SQL
async function findOrCreateUserPGlite(email: string) {
  const pglite = getPGliteInstance();
  if (!pglite) {
    console.error('[Auth] PGlite instance not available');
    throw new Error('PGlite instance not available');
  }

  // Find existing user
  const existingResult = await pglite.query(
    `SELECT id, email, name FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );

  if (existingResult.rows.length > 0) {
    const user = existingResult.rows[0] as { id: string; email: string; name: string | null };
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Found existing user:', user.id);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  // Create new user
  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth] Creating new user for:', email);
  }
  const newUserResult = await pglite.query(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name`,
    [email, email.split("@")[0]]
  );

  const newUser = newUserResult.rows[0] as { id: string; email: string; name: string | null };
  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth] Created new user:', newUser.id);
  }
  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
  };
}

// Helper: Find or create user via Drizzle ORM (PostgreSQL)
async function findOrCreateUserPostgres(email: string) {
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUsers.length > 0) {
    return {
      id: existingUsers[0].id,
      email: existingUsers[0].email,
      name: existingUsers[0].name,
    };
  }

  // Create new user for test account
  const newUser = await db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0],
    })
    .returning();

  return {
    id: newUser[0].id,
    email: newUser[0].email,
    name: newUser[0].name,
  };
}

// Only add Credentials provider in development mode for testing
if (process.env.NODE_ENV === 'development') {
  providers.push(
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] authorize called with:', credentials?.email);
        }

        if (!credentials?.email || !credentials?.password) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Missing credentials');
          }
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Check password against environment variable
        const testPassword = process.env.TEST_USER_PASSWORD || "test1234";
        if (password !== testPassword) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Invalid password');
          }
          return null;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Password check passed, currentProvider:', currentProvider);
        }

        // Ensure database is ready before operations
        try {
          await ensureDbReady();
        } catch (e) {
          console.error('[Auth] ensureDbReady failed:', e);
          throw e;
        }

        // Route to appropriate helper based on provider
        if (currentProvider === 'pglite') {
          return await findOrCreateUserPGlite(email);
        }

        return await findOrCreateUserPostgres(email);
      },
    })
  );
}

// Build NextAuth config
const authConfig: NextAuthConfig = {
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// Only add adapter for PostgreSQL (PGlite doesn't support DrizzleAdapter well)
if (process.env.DB_PROVIDER !== 'pglite') {
  authConfig.adapter = DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
