import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PipelineStatus } from "@prisma/client";

async function assertOwnership(id: string, userId: string) {
  const item = await db.pipelineItem.findUnique({ where: { id } });
  if (!item) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (item.userId !== userId) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { item };
}

// PATCH /api/pipeline/:id — edit fields and/or move stage
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const { error } = await assertOwnership(id, user.id);
  if (error) return error;

  const body = await req.json();
  if (body.status && !Object.values(PipelineStatus).includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body.status === "SCHEDULED" && !body.scheduledFor) {
    return NextResponse.json({ error: "scheduledFor is required once an item is scheduled" }, { status: 400 });
  }

  const updated = await db.pipelineItem.update({
    where: { id },
    data: {
      title: body.title,
      notes: body.notes,
      platform: body.platform,
      status: body.status,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    },
  });
  return NextResponse.json({ item: updated });
}

// DELETE /api/pipeline/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const { error } = await assertOwnership(id, user.id);
  if (error) return error;

  await db.pipelineItem.delete({ where: { id } });
  return NextResponse.json({ deleted: id });
}
