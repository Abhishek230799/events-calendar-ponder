import { NextRequest, NextResponse } from "next/server";
import { scanAndCreateReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic"; // never cache a cron endpoint

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await scanAndCreateReminders();
  return NextResponse.json(result);
}
