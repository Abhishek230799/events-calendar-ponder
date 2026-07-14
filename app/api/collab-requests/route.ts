import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/collab-requests — everything sent to and from the caller.
// eventId is a loose reference (not a real FK, by design — see schema),
// so event titles are resolved with a best-effort follow-up lookup rather
// than a join; a deleted event just means the title falls back gracefully.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [received, sent] = await Promise.all([
    db.collabRequest.findMany({
      where: { toId: user.id },
      include: { from: { select: { id: true, name: true, handle: true, image: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.collabRequest.findMany({
      where: { fromId: user.id },
      include: { to: { select: { id: true, name: true, handle: true, image: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const eventIds = [...new Set([...received, ...sent].map((r) => r.eventId).filter(Boolean))] as string[];
  const events = eventIds.length
    ? await db.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, title: true } })
    : [];
  const eventTitleById = new Map(events.map((e) => [e.id, e.title]));

  return NextResponse.json({
    received: received.map((r) => ({ ...r, eventTitle: r.eventId ? eventTitleById.get(r.eventId) ?? null : null })),
    sent: sent.map((r) => ({ ...r, eventTitle: r.eventId ? eventTitleById.get(r.eventId) ?? null : null })),
  });
}

// POST /api/collab-requests
// body: { toId: string, eventId?: string, message?: string }
// Deliberately minimal — persists a row, nothing more. No fake "delivered"
// state, no accept/reject flow yet, since the rest of Ponders' social graph
// and notifications don't exist to build that on top of.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { toId, eventId, message } = await req.json();
  if (!toId) return NextResponse.json({ error: "toId is required" }, { status: 400 });
  if (toId === user.id) return NextResponse.json({ error: "Can't send a collab request to yourself" }, { status: 400 });

  const toUser = await db.user.findUnique({ where: { id: toId } });
  if (!toUser) return NextResponse.json({ error: "That creator doesn't exist" }, { status: 404 });

  const request = await db.collabRequest.create({
    data: { fromId: user.id, toId, eventId: eventId ?? null, message: message ?? null },
  });

  return NextResponse.json({ request }, { status: 201 });
}
