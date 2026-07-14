import { db } from "./db";

const WINDOW_HOURS = 24;
const LIMIT_PER_WINDOW = 5;

/**
 * Deliberately DB-backed, not in-memory: Vercel serverless functions don't
 * share memory across invocations, so an in-process counter would reset
 * constantly and the limit would never actually hold. A count() against the
 * indexed (hostId, createdAt) column is cheap at 100-concurrent-user scale —
 * if this needs to scale further, swap for Redis with a sliding window.
 */
export async function checkEventCreationRateLimit(userId: string) {
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60_000);

  const recentCount = await db.event.count({
    where: { hostId: userId, createdAt: { gte: windowStart } },
  });

  return {
    allowed: recentCount < LIMIT_PER_WINDOW,
    remaining: Math.max(0, LIMIT_PER_WINDOW - recentCount),
    limit: LIMIT_PER_WINDOW,
  };
}
