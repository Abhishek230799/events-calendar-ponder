import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const COUNTRY_CODES = ["US", "IN", "GB", "CA", "AU", "DE", "FR", "JP", "BR"];

async function fetchHolidays(countryCode: string, year: number) {
  const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`);
  const text = await res.text();
  if (!res.ok || !text) return null;
  return JSON.parse(text) as { date: string; name: string; localName: string }[];
}

async function main() {
  const year = new Date().getFullYear();

  for (const countryCode of COUNTRY_CODES) {
    let holidays = await fetchHolidays(countryCode, year);
    let usedYear = year;

    // Some countries (e.g. India) don't get next year's dates published until
    // closer to the year itself — fall back to last year's as a reasonable
    // approximation rather than showing nothing.
    if (!holidays) {
      holidays = await fetchHolidays(countryCode, year - 1);
      usedYear = year - 1;
    }

    if (!holidays) {
      console.error(`No data for ${countryCode} in ${year} or ${year - 1} — skipping`);
      continue;
    }

    for (const h of holidays) {
      await db.holiday.upsert({
        where: { date_countryCode_name: { date: new Date(h.date), countryCode, name: h.name } },
        create: { date: new Date(h.date), name: h.name, localName: h.localName, countryCode },
        update: { localName: h.localName },
      });
    }
    console.log(`Synced ${holidays.length} holidays for ${countryCode}${usedYear !== year ? ` (used ${usedYear} — ${year} not published yet)` : ""}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
