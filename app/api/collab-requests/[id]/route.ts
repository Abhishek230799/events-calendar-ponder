import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CollabRequestStatus } from "@prisma/client";

// PATCH /api/collab-requests/:id
// body: { status: "ACCEPTED" | "DECLINED" | "CANCELLED", cancelReason?: string }
// Accept/decline: recipient (toId) only, from PENDING.
// Cancel: either party, from PENDING or ACCEPTED — backing out of something
// you already agreed to is still allowed, unlike accept/decline which is a
// one-time response to the original ask.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const { status, cancelReason } = await req.json();

  if (!status || !["ACCEPTED", "DECLINED", "CANCELLED"].includes(status)) {
    return NextResponse.json({ error: "status must be ACCEPTED, DECLINED, or CANCELLED" }, { status: 400 });
  }

  const request = await db.collabRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant = request.fromId === user.id || request.toId === user.id;
  if (!isParticipant) return NextResponse.json({ error: "Not part of this collab request" }, { status: 403 });

  if (status === "CANCELLED") {
    if (!["PENDING", "ACCEPTED"].includes(request.status)) {
      return NextResponse.json({ error: `Already ${request.status.toLowerCase()}` }, { status: 400 });
    }
  } else {
    // ACCEPTED / DECLINED — recipient only, from PENDING
    if (request.toId !== user.id) {
      return NextResponse.json({ error: "Only the recipient can respond to this request" }, { status: 403 });
    }
    if (request.status !== "PENDING") {
      return NextResponse.json({ error: `Already ${request.status.toLowerCase()}` }, { status: 400 });
    }
  }

  const updated = await db.collabRequest.update({
    where: { id },
    data: {
      status: status as CollabRequestStatus,
      cancelReason: status === "CANCELLED" ? cancelReason ?? null : undefined,
    },
  });

  return NextResponse.json({ request: updated });
}
