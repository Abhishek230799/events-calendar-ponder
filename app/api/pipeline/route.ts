import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PipelineStatus } from "@prisma/client";

// GET /api/pipeline — the calling creator's own items only, never anyone else's.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const items = await db.pipelineItem.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { scheduledFor: "asc" }],
  });
  return NextResponse.json({ items });
}

// POST /api/pipeline — create a new pipeline item, defaults to DRAFT
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { title, notes, platform, status, scheduledFor } = await req.json();

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (status && !Object.values(PipelineStatus).includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (status === "SCHEDULED" && !scheduledFor) {
    return NextResponse.json({ error: "scheduledFor is required once an item is scheduled" }, { status: 400 });
  }

  const item = await db.pipelineItem.create({
    data: {
      userId: user.id,
      title,
      notes,
      platform,
      status: status ?? "DRAFT",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
