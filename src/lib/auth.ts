import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Simple password check for test accounts (dev only)
        // In production, use proper password hashing (bcrypt)
        if (password !== "test1234") {
          return null;
        }

        // Find or create user
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
      },
    }),
  ],
  session: {
    strategy: "jwt", // Changed to JWT for credentials provider
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
});
