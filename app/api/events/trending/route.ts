import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/events/trending?limit=10
// Ranks upcoming events by total (private + visible) GOING count — a
// private RSVP is still a real interest signal, it's just not attributed
// to a person in the UI. Ranking never leaks who those private people are.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

  const events = await db.event.findMany({
    where: {
      OR: [{ recurrenceRule: null, startAt: { gte: new Date() } }, { recurrenceRule: { not: null } }],
    },
    include: {
      host: { select: { id: true, name: true, handle: true, image: true } },
      rsvps: { where: { status: "GOING" } },
    },
    take: 500, // candidate pool cap — fine at this scale; a targeted rework item if it grows, see earlier notes
  });

  const ranked = events
    .map((event) => {
      const goingUserIds = new Set(event.rsvps.map((r) => r.userId));
      const visibleUserIds = new Set(event.rsvps.filter((r) => r.visible).map((r) => r.userId));
      return {
        id: event.id,
        title: event.title,
        category: event.category,
        startAt: event.startAt,
        host: event.host,
        attendeeCount: goingUserIds.size,
        visibleAttendeeCount: visibleUserIds.size,
        myRsvp: event.rsvps.find((r) => r.userId === user.id)?.status ?? null,
      };
    })
    .filter((e) => e.attendeeCount > 0)
    .sort((a, b) => b.attendeeCount - a.attendeeCount)
    .slice(0, limit);

  return NextResponse.json({ trending: ranked });
}
