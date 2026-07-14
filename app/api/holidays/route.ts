import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/holidays?from=ISO&to=ISO
// Scoped to the caller's own country — a Brazilian creator never sees
// German holidays cluttering their calendar. Falls back to an empty list
// if the user has no country set, rather than guessing.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!user.country) return NextResponse.json({ holidays: [] });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params are required (ISO dates)" }, { status: 400 });
  }

  const holidays = await db.holiday.findMany({
    where: { countryCode: user.country, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ holidays });
}
