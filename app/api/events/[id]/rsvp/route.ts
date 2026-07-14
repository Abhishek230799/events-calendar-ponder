import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { RsvpStatus } from "@prisma/client";

function resolveWindow(event: { startAt: Date; endAt: Date }, occurrenceKey: string) {
  if (occurrenceKey === "series") return { start: event.startAt, end: event.endAt };
  const start = new Date(occurrenceKey);
  const durationMs = event.endAt.getTime() - event.startAt.getTime();
  return { start, end: new Date(start.getTime() + durationMs) };
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

// POST /api/events/:id/rsvp
// body: { status: "GOING" | "INTERESTED" | "DECLINED", occurrenceKey?: string, visible?: boolean }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: eventId } = await params;
  const body = await req.json();
  const { status, occurrenceKey, visible } = body;
  const resolvedOccurrenceKey = occurrenceKey ?? "series";

  if (!status || !Object.values(RsvpStatus).includes(status)) {
    return NextResponse.json({ error: "status must be GOING, INTERESTED, or DECLINED" }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (status === "GOING") {
    const targetWindow = resolveWindow(event, resolvedOccurrenceKey);
    const otherGoing = await db.rsvp.findMany({
      where: { userId: user.id, status: "GOING", NOT: { eventId, occurrenceKey: resolvedOccurrenceKey } },
      include: { event: { select: { id: true, title: true, startAt: true, endAt: true } } },
    });
    const conflict = otherGoing.find((r) => overlaps(targetWindow, resolveWindow(r.event, r.occurrenceKey)));
    if (conflict) {
      return NextResponse.json(
        {
          error: `You're already going to "${conflict.event.title}" at this time.`,
          conflictingEvent: { id: conflict.event.id, title: conflict.event.title },
        },
        { status: 409 }
      );
    }
  }

  const rsvp = await db.rsvp.upsert({
    where: {
      eventId_userId_occurrenceKey: { eventId, userId: user.id, occurrenceKey: resolvedOccurrenceKey },
    },
    create: {
      eventId,
      userId: user.id,
      status,
      visible: visible ?? false,
      occurrenceKey: resolvedOccurrenceKey,
    },
    update: {
      status,
      ...(visible !== undefined ? { visible } : {}),
    },
  });

  return NextResponse.json({ rsvp });
}

// DELETE /api/events/:id/rsvp?occurrenceKey=...
// Removes the RSVP entirely, returning to "no response" — distinct from
// setting status to DECLINED, which is still an explicit response.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: eventId } = await params;
  const { searchParams } = new URL(req.url);
  const occurrenceKey = searchParams.get("occurrenceKey") ?? "series";

  await db.rsvp
    .delete({
      where: { eventId_userId_occurrenceKey: { eventId, userId: user.id, occurrenceKey } },
    })
    .catch((err) => {
      if (err.code !== "P2025") throw err; // P2025 = not found = already removed, fine
    });

  return NextResponse.json({ removed: true });
}
