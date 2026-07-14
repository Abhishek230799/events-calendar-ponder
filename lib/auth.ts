import { auth } from "@/auth";
import { db } from "./db";

/**
 * The one function the rest of the app depends on for "who's logged in."
 * Everything downstream — API routes, server components — calls this
 * instead of touching Auth.js's `auth()` directly. That's what keeps a
 * future real-Ponder-auth swap to a one-file change: this function's
 * signature (User | null) is the contract, not how it's implemented.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
