import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Pick a creator",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null;
        const user = await db.user.findUnique({ where: { id: credentials.userId as string } });
        return user ?? null;
      },
    }),
  ],
  callbacks: {
    // Persist the user id + handle/image onto the JWT on sign-in — handle in
    // particular is needed client-side (e.g. optimistic attendee-list updates)
    // and isn't part of Auth.js's default session shape.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.handle = (user as { handle?: string }).handle;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.handle = token.handle as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
