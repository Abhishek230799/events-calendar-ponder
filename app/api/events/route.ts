import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { expandOccurrences, validateRecurrenceRule } from "@/lib/recurrence";
import { checkEventCreationRateLimit } from "@/lib/rateLimit";
import { EventCategory } from "@prisma/client";

// GET /api/events?from=ISO&to=ISO
// Imported events (TICKETMASTER/CONFS_TECH) are scoped to the viewer's own
// country — a creator shouldn't get sent every concert on the planet just
// to render one month's grid. PLATFORM events (countryCode null, since a
// creator's own event is relevant regardless of where they are) are always
// included. If the user has no country set, they only see PLATFORM events.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params are required (ISO dates)" }, { status: 400 });
  }
  const rangeStart = new Date(from);
  const rangeEnd = new Date(to);

  const countryScope = user.country
    ? { OR: [{ countryCode: null }, { countryCode: user.country }] }
    : { countryCode: null };

  const events = await db.event.findMany({
    where: {
      AND: [
        {
          OR: [
            { recurrenceRule: null, startAt: { gte: rangeStart, lte: rangeEnd } },
            { recurrenceRule: { not: null }, startAt: { lte: rangeEnd } },
          ],
        },
        countryScope,
      ],
    },
    include: {
      host: { select: { id: true, name: true, handle: true, image: true } },
      rsvps: { where: { status: "GOING" } },
    },
  });

  const occurrences = events.flatMap((event) => {
    const goingUserIds = new Set(event.rsvps.map((r) => r.userId));
    const visibleUserIds = new Set(event.rsvps.filter((r) => r.visible).map((r) => r.userId));
    const myRsvp = event.rsvps.find((r) => r.userId === user.id);

    return expandOccurrences(event, rangeStart, rangeEnd).map((occ) => ({
      ...occ,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        location: event.location,
        isVirtual: event.isVirtual,
        timezone: event.timezone,
        recurrenceRule: event.recurrenceRule,
        source: event.source,
        host: event.host,
        attendeeCount: goingUserIds.size,
        visibleAttendeeCount: visibleUserIds.size,
        myRsvp: myRsvp?.status ?? null,
        myRsvpVisible: myRsvp?.visible ?? false,
      },
    }));
  });

  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
  return NextResponse.json({ occurrences });
}

// POST /api/events — create a one-off or recurring event, hosted by the caller
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { title, description, category, location, isVirtual, startAt, endAt, timezone, recurrenceRule, reminderOffsets } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "title, startAt, endAt are required" }, { status: 400 });
  }
  if (new Date(endAt) <= new Date(startAt)) {
    return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 });
  }
  if (category && !Object.values(EventCategory).includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (recurrenceRule) {
    const { valid, error } = validateRecurrenceRule(recurrenceRule);
    if (!valid) return NextResponse.json({ error: `invalid recurrenceRule: ${error}` }, { status: 400 });
  }

  const rate = await checkEventCreationRateLimit(user.id);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `You've hit the limit of ${rate.limit} events per day. This keeps the calendar from filling up with spam.` },
      { status: 429 }
    );
  }

  const event = await db.event.create({
    data: {
      title,
      description,
      category: category ?? "OTHER",
      location,
      isVirtual: isVirtual ?? true,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      timezone: timezone ?? "UTC",
      recurrenceRule: recurrenceRule ?? null,
      reminderOffsets: reminderOffsets ?? [60],
      hostId: user.id,
    },
  });

  await db.rsvp.create({
    data: { eventId: event.id, userId: user.id, status: "GOING" },
  });

  return NextResponse.json({ event }, { status: 201 });
}
