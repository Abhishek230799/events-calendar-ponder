import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/events/created — everything the caller hosts, any date, own country
// filter doesn't apply here since these are the user's own creations.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const events = await db.event.findMany({
    where: { hostId: user.id },
    include: { rsvps: { where: { status: "GOING" } } },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      location: e.location,
      isVirtual: e.isVirtual,
      startAt: e.startAt,
      endAt: e.endAt,
      timezone: e.timezone,
      recurrenceRule: e.recurrenceRule,
      reminderOffsets: e.reminderOffsets,
      attendeeCount: e.rsvps.length,
    })),
  });
}
