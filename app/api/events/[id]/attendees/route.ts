import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/events/:id/attendees
// Returns only the visible attendee list, plus the true total going count —
// never exposes who the private RSVPs belong to.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: eventId } = await params;

  const rsvps = await db.rsvp.findMany({
    where: { eventId, status: "GOING" },
    include: { user: { select: { id: true, name: true, handle: true, image: true } } },
  });

  const seen = new Set<string>();
  const totalGoing = rsvps.filter((r) => !seen.has(r.userId) && seen.add(r.userId)).length;

  const visibleSeen = new Set<string>();
  const visibleAttendees = rsvps
    .filter((r) => r.visible && !visibleSeen.has(r.userId) && visibleSeen.add(r.userId))
    .map((r) => r.user);

  return NextResponse.json({ totalGoing, visibleAttendees });
}
