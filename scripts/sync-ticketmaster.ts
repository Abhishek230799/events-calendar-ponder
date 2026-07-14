import "dotenv/config";
import { PrismaClient, EventCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const API_KEY = process.env.TICKETMASTER_API_KEY!;

const COUNTRY_CODES = ["US", "CA", "MX", "GB", "IE", "AU", "NZ", "DE", "FR", "ES"];

const CATEGORY_MAP: Record<string, EventCategory> = {
  Music: "MUSIC",
  Sports: "SPORTS",
  "Arts & Theatre": "ARTS_THEATRE",
  Film: "FILM",
};

async function fetchEventsPage(countryCode: string, page: number) {
  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("countryCode", countryCode);
  url.searchParams.set("size", "200");
  url.searchParams.set("page", String(page));

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  page ${page} failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data._embedded?.events ?? [];
}

async function main() {
  let totalSynced = 0;

  for (const countryCode of COUNTRY_CODES) {
    let page = 0;
    let countrySynced = 0;

    while (page < 5) {
      const events = await fetchEventsPage(countryCode, page);
      if (!events || events.length === 0) break;

      for (const event of events) {
        const venue = event._embedded?.venues?.[0];
        const segment = event.classifications?.[0]?.segment?.name;
        const category: EventCategory = CATEGORY_MAP[segment] ?? "OTHER";

        const startAt = event.dates?.start?.dateTime
          ? new Date(event.dates.start.dateTime)
          : event.dates?.start?.localDate
          ? new Date(event.dates.start.localDate)
          : null;
        if (!startAt) continue;

        const endAt = new Date(startAt.getTime() + 3 * 60 * 60_000);

        await db.event.upsert({
          where: { source_externalId: { source: "TICKETMASTER", externalId: event.id } },
          create: {
            title: event.name,
            category,
            location: venue ? `${venue.name}, ${venue.city?.name ?? ""}`.trim() : null,
            isVirtual: false,
            startAt,
            endAt,
            source: "TICKETMASTER",
            externalId: event.id,
            countryCode, // the loop variable — the country we're currently syncing, not re-derived
          },
          update: {
            title: event.name,
            startAt,
            endAt,
            countryCode,
          },
        });
        countrySynced++;
      }

      page++;
      await new Promise((r) => setTimeout(r, 250));
    }

    console.log(`Synced ${countrySynced} events for ${countryCode}`);
    totalSynced += countrySynced;
  }

  console.log(`Total: ${totalSynced} events synced`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
