import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import ical from "node-ical";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const FEED_URL =
  "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

// node-ical types SUMMARY as string | { val: string; params: ... } — the object
// form shows up when the ICS field carries extra parameters. Unwrap it properly
// rather than String()-coercing, which would just produce "[object Object]".
function summaryText(summary: unknown): string {
  if (typeof summary === "string") return summary;
  if (summary && typeof summary === "object" && "val" in summary) return String((summary as { val: string }).val);
  return "Untitled";
}

async function main() {
  const events = await ical.async.fromURL(FEED_URL);
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 1, 0, 1);

  let synced = 0;
  for (const key in events) {
    const raw = events[key];
    if (!raw || raw.type !== "VEVENT") continue;
    const event = raw as ical.VEvent;
    if (!event.start || event.start < cutoff) continue;

    const name = summaryText(event.summary);

    await db.holiday.upsert({
      where: { date_countryCode_name: { date: event.start, countryCode: "IN", name } },
      create: { date: event.start, name, localName: name, countryCode: "IN" },
      update: {},
    });
    synced++;
  }
  console.log(`Synced ${synced} India holidays (public holidays + observances)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
