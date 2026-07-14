import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, handle: true, image: true } },
      rsvps: { include: { user: { select: { id: true, name: true, handle: true, image: true } } } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event });
}

// PATCH /api/events/:id — only the host can edit. Imported events (hostId
// null) can never be edited by anyone through this route — there's no
// "nobody can" special case to write, since hostId !== user.id is already
// true when hostId is null.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.hostId !== user.id) {
    return NextResponse.json({ error: "Only the host can edit this event" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await db.event.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      location: body.location,
      isVirtual: body.isVirtual,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
      timezone: body.timezone,
      recurrenceRule: body.recurrenceRule,
      reminderOffsets: body.reminderOffsets,
    },
  });
  return NextResponse.json({ event: updated });
}

// DELETE /api/events/:id — host only. Cascades to Rsvp rows (schema-level onDelete: Cascade).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.hostId !== user.id) {
    return NextResponse.json({ error: "Only the host can delete this event" }, { status: 403 });
  }

  await db.event.delete({ where: { id } });
  return NextResponse.json({ deleted: id });
}
